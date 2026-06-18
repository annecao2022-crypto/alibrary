"""Z-Library client using Playwright to bypass Cloudflare protection."""
import re
import requests
from bs4 import BeautifulSoup
from typing import Optional
from playwright.sync_api import sync_playwright

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}


def _make_cookies(base: str, cookie_str: str) -> list:
    """Parse 'key=val; key2=val2' into Playwright cookie dicts."""
    domain = re.sub(r'^https?://', '', base).split('/')[0]
    cookies = []
    for part in cookie_str.split(';'):
        part = part.strip()
        if '=' not in part:
            continue
        name, value = part.split('=', 1)
        cookies.append({'name': name.strip(), 'value': value.strip(),
                        'domain': domain, 'path': '/'})
    return cookies


class ZLibraryClient:
    def __init__(self, base_url: str, email: str = "", password: str = "", cookie: str = ""):
        self.base = base_url.rstrip("/")
        self.cookie_str = cookie
        self.email = email
        self.password = password

    def _get_page_html_with_covers(self, url: str) -> tuple:
        """Fetch search page and capture rendered cover URLs from loaded images."""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=[
                '--disable-blink-features=AutomationControlled', '--no-sandbox',
            ])
            ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
            if self.cookie_str:
                ctx.add_cookies(_make_cookies(self.base, self.cookie_str))
            page = ctx.new_page()
            page.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
            page.goto(url, timeout=30000, wait_until='domcontentloaded')
            try:
                page.wait_for_selector('z-bookcard', timeout=12000)
            except Exception:
                page.wait_for_timeout(3000)
            # Scroll to trigger lazy-load
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(1500)
            # Capture cover URLs from rendered DOM
            cover_map = page.evaluate("""
                () => {
                    const map = {};
                    document.querySelectorAll('z-bookcard').forEach(card => {
                        const id = card.getAttribute('id');
                        const img = card.querySelector('img');
                        if (id && img) {
                            const src = img.src || img.getAttribute('data-src') || img.getAttribute('src') || '';
                            if (src && !src.startsWith('data:')) map[id] = src;
                        }
                    });
                    return map;
                }
            """)
            html = page.content()
            browser.close()
        return html, cover_map or {}

    def _get_page_html(self, url: str, wait_selector: str = None, wait_ms: int = 3000) -> str:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
            ])
            ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
            if self.cookie_str:
                ctx.add_cookies(_make_cookies(self.base, self.cookie_str))
            page = ctx.new_page()
            page.add_init_script(
                "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
            )
            page.goto(url, timeout=30000, wait_until='domcontentloaded')
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=12000)
                except Exception:
                    page.wait_for_timeout(wait_ms)
            else:
                page.wait_for_timeout(wait_ms)
            html = page.content()
            browser.close()
        return html

    # ── Search ────────────────────────────────────────────────────────────

    def search(self, query: str, limit: int = 12) -> list:
        url = f"{self.base}/s/{requests.utils.quote(query)}?extensions[]=epub&extensions[]=mobi"
        html, cover_map = self._get_page_html_with_covers(url)
        return self._parse_results(html, limit, cover_map)

    def _parse_results(self, html: str, limit: int, cover_map: dict = None) -> list:
        soup = BeautifulSoup(html, 'lxml')
        books = []
        for card in soup.select('z-bookcard')[:limit]:
            ext = card.get('extension', '').lower()
            if ext not in ('epub', 'mobi'):
                continue
            title  = card.select_one('[slot="title"]')
            author = card.select_one('[slot="author"]')
            img    = card.select_one('img')
            cover  = (img.get('src') or img.get('data-src') or '') if img else ''
            # Use cover_map from Playwright's rendered DOM if available
            book_id = card.get('id', '')
            if cover_map and book_id in cover_map:
                cover = cover_map[book_id]
            if cover and not cover.startswith('http'):
                cover = self.base + cover

            book_id    = card.get('id', '')
            href       = card.get('href', '')
            dl_path    = card.get('download', '')
            title_text = title.text.strip() if title else ''

            # Link to search results for the book title — more reliable than detail page
            search_url = f"{self.base}/s/{requests.utils.quote(title_text)}" if title_text else (self.base + href if href else '')

            books.append({
                'id':       book_id,
                'hash':     '',
                'title':    title_text,
                'author':   author.text.strip() if author else '',
                'year':     card.get('year', ''),
                'format':   ext,
                'cover':    cover,
                'url':      search_url,
                'dl_path':  dl_path,
            })
        return books

    # ── Import from book page URL ─────────────────────────────────────────

    def import_from_url(self, url: str) -> dict:
        html = self._get_page_html(url, wait_selector='z-bookcard, .dlButton, a[href*="/dl/"]', wait_ms=3000)
        soup = BeautifulSoup(html, 'lxml')

        title  = self._text(soup, ['h1[itemprop="name"]', '.book-title', 'h1'])
        author = self._text(soup, ['a[itemprop="author"]', '.authors a'])
        desc   = self._text(soup, ['#bookDescription', '[itemprop="description"]'])

        cover_el = soup.select_one('img[itemprop="image"], .cover img, img.cover')
        cover_url = ''
        if cover_el:
            cover_url = cover_el.get('src') or cover_el.get('data-src') or ''
            if cover_url and not cover_url.startswith('http'):
                cover_url = self.base + cover_url

        # Find download link
        dl_url = ''
        fmt = ''
        for ext in ('epub', 'mobi'):
            for sel in [f'a[href*=".{ext}"]', f'a.dlButton', 'a[href*="/dl/"]']:
                el = soup.select_one(sel)
                if el:
                    href = el.get('href', '')
                    if ext in href.lower() or '/dl/' in href:
                        dl_url = href if href.startswith('http') else self.base + href
                        fmt = ext
                        break
            if dl_url:
                break

        # Try z-bookcard on the page
        if not dl_url:
            card = soup.select_one('z-bookcard')
            if card:
                dl_path = card.get('download', '')
                fmt = card.get('extension', 'epub').lower()
                if dl_path:
                    dl_url = self.base + dl_path if not dl_path.startswith('http') else dl_path

        if not dl_url:
            raise ValueError("未找到下载链接")

        content, fmt = self._download_file_pw(dl_url, fmt)
        cover = self._download_bytes(cover_url) if cover_url else None

        return {'title': title, 'author': author, 'description': desc,
                'format': fmt, 'content': content, 'cover': cover}

    # ── Import by search result ───────────────────────────────────────────

    def import_by_id(self, book_id: str, book_hash: str,
                     title: str = '', author: str = '',
                     cover_url: str = '', description: str = '',
                     dl_path: str = '', url: str = '') -> dict:
        # Try direct download path first
        if dl_path:
            full_dl = dl_path if dl_path.startswith('http') else self.base + dl_path
            try:
                content, fmt = self._download_file_pw(full_dl)
                cover = self._download_bytes(cover_url) if cover_url else None
                return {'title': title, 'author': author, 'description': description,
                        'format': fmt, 'content': content, 'cover': cover}
            except Exception:
                pass

        # Fall back to book page
        if url:
            return self.import_from_url(url)

        raise ValueError("缺少下载信息")

    # ── Helpers ───────────────────────────────────────────────────────────

    def _download_file_pw(self, url: str, fmt: str = '') -> tuple:
        """Download a file using Playwright (handles JS redirects)."""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
            ctx = browser.new_context(user_agent=HEADERS["User-Agent"],
                                       accept_downloads=True)
            if self.cookie_str:
                ctx.add_cookies(_make_cookies(self.base, self.cookie_str))
            page = ctx.new_page()

            download_content = None
            detected_fmt = fmt

            with page.expect_download(timeout=60000) as dl_info:
                page.goto(url, timeout=30000, wait_until='commit')

            dl = dl_info.value
            filename = dl.suggested_filename or f'book.{fmt or "epub"}'
            detected_fmt = filename.rsplit('.', 1)[-1].lower() if '.' in filename else (fmt or 'epub')
            download_content = dl.read_stream().read()
            browser.close()

        return download_content, detected_fmt

    def _download_bytes(self, url: str) -> Optional[bytes]:
        if not url:
            return None
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            return r.content if r.ok else None
        except Exception:
            return None

    def _text(self, soup, selectors: list) -> str:
        for sel in selectors:
            el = soup.select_one(sel)
            if el:
                return el.get_text(strip=True)
        return ''

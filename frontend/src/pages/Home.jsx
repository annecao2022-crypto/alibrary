import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getBooks, getMe, getConfig, zlibSearch, zlibRecommendations, getLikeCounts, getTopLiked, addWish } from '../api'
import LikeButton from '../components/LikeButton'
import BookCard from '../components/BookCard'
import PreviewModal from '../components/PreviewModal'

const TOP_LIKED_MAX = 4

const ZLIB_GRADIENTS = [
  'from-blue-50 to-indigo-100',
  'from-rose-50 to-pink-100',
  'from-amber-50 to-orange-100',
  'from-emerald-50 to-teal-100',
  'from-violet-50 to-purple-100',
  'from-sky-50 to-cyan-100',
]

function ZlibCard({ book, index = 0, category = '', likeCount = 0, className = 'w-36 flex-shrink-0' }) {
  const grad = ZLIB_GRADIENTS[index % ZLIB_GRADIENTS.length]
  return (
    <a href={book.url} target="_blank" rel="noopener noreferrer"
      className={`${className} bg-white rounded-xl border border-slate-100 hover:shadow-md transition-all overflow-hidden group`}>
      <div className={`aspect-[3/4] bg-gradient-to-br ${grad} relative overflow-hidden`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          <span className="text-xs font-semibold text-center leading-snug text-slate-700 line-clamp-5">{book.title}</span>
          {book.author && (
            <span className="text-xs text-slate-400 text-center mt-2 line-clamp-2">{book.author}</span>
          )}
        </div>
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <span className="text-white text-xs font-medium">Z-Library →</span>
        </div>
        {category && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-white/80 rounded text-slate-500 text-xs">{category}</span>
        )}
      </div>
      <div className="p-2 flex items-center justify-between">
        <p className="text-xs text-slate-400 uppercase font-bold">{book.format}</p>
        <LikeButton zlibTitle={book.title} zlibUrl={book.url} count={likeCount} />
      </div>
    </a>
  )
}

function sortBooks(books, method) {
  const arr = [...books]
  if (method === 'title')   return arr.sort((a, b) => a.title.localeCompare(b.title, 'zh'))
  if (method === 'random')  return arr.sort(() => Math.random() - 0.5)
  return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // newest
}

export default function Home() {
  const [allBooks, setAllBooks]     = useState([])
  const [category, setCategory]     = useState('全部')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]         = useState('')
  const [sort, setSort]             = useState('newest')
  const [previewBook, setPreviewBook] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [zlibQuery, setZlibQuery]   = useState('')
  const [zlibResults, setZlibResults] = useState([])
  const [zlibLoading, setZlibLoading] = useState(false)
  const [zlibRecs, setZlibRecs]     = useState([])
  const [recsLoaded, setRecsLoaded] = useState(false)
  const [likeCounts, setLikeCounts] = useState({ books: {}, zlib: {} })
  const [topLiked, setTopLiked]     = useState({ library: [], zlib: [] })
  const [wishOpen, setWishOpen]     = useState(false)
  const [wishName, setWishName]     = useState('')
  const [wishContent, setWishContent] = useState('')
  const [wishSent, setWishSent]     = useState(false)
  const [wishLoading, setWishLoading] = useState(false)
  const [config, setConfig]         = useState({
    site_title: "Anne's Library",
    site_subtitle: '照体独立，历历孤明',
    announcement: '',
    description: '',
    theme_color: '#2563eb',
    featured_book_ids: '[]',
    default_sort: 'newest',
    category_colors: '{}',
  })

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Apply theme color globally
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', config.theme_color || '#2563eb')
  }, [config.theme_color])

  useEffect(() => {
    getConfig().then(r => { setConfig(r.data); setSort(r.data.default_sort || 'newest') }).catch(() => {})
    if (localStorage.getItem('admin_token')) {
      getMe().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false))
    }
    // Load recommendations in background
    zlibRecommendations().then(r => setZlibRecs(r.data.categories || [])).catch(() => {}).finally(() => setRecsLoaded(true))
    getLikeCounts().then(r => setLikeCounts(r.data)).catch(() => {})
    getTopLiked().then(r => setTopLiked(r.data)).catch(() => {})
  }, [])

  const doZlibSearch = async () => {
    if (!zlibQuery.trim()) return
    setZlibLoading(true); setZlibResults([])
    try {
      const r = await zlibSearch(zlibQuery)
      setZlibResults(r.data.results || [])
    } catch { setZlibResults([]) }
    finally { setZlibLoading(false) }
  }

  useEffect(() => {
    setLoading(true)
    getBooks().then(r => setAllBooks(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const featuredIds = useMemo(() => {
    try { return JSON.parse(config.featured_book_ids || '[]') } catch { return [] }
  }, [config.featured_book_ids])

  const categoryColors = useMemo(() => {
    try { return JSON.parse(config.category_colors || '{}') } catch { return {} }
  }, [config.category_colors])

  const categories = useMemo(() =>
    ['全部', ...Array.from(new Set(allBooks.map(b => b.category).filter(Boolean)))],
    [allBooks]
  )

  const filtered = useMemo(() => {
    let books = category === '全部' ? allBooks : allBooks.filter(b => b.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      books = books.filter(b => b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q))
    }
    return sortBooks(books, sort)
  }, [allBooks, category, search, sort])

  const featuredBooks = useMemo(() =>
    featuredIds.map(id => allBooks.find(b => b.id === id)).filter(Boolean),
    [featuredIds, allBooks]
  )

  const submitWish = async () => {
    if (!wishContent.trim()) return
    setWishLoading(true)
    try {
      await addWish({ name: wishName.trim() || null, content: wishContent.trim() })
      setWishSent(true)
      setWishContent('')
      setWishName('')
      setTimeout(() => { setWishSent(false); setWishOpen(false) }, 2000)
    } catch { /* silent */ }
    finally { setWishLoading(false) }
  }

  const updateBookLocally = (id, patch) => {
    setAllBooks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  const primary = config.theme_color || '#2563eb'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Announcement banner */}
      {config.announcement && (
        <div className="text-white text-sm text-center py-2 px-4 font-medium" style={{ backgroundColor: primary }}>
          {config.announcement}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-slate-900">{config.site_title}</h1>
            {config.site_subtitle && (
              <p className="text-xs text-slate-400 hidden sm:block">{config.site_subtitle}</p>
            )}
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="搜索书名或作者..."
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-slate-50"
              style={{ '--tw-ring-color': primary }}
            />
          </div>
          <Link to="/admin" className="flex-shrink-0 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
            管理后台
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Description */}
        {config.description && (
          <p className="text-sm text-slate-500 mb-5 leading-relaxed border-l-4 pl-3" style={{ borderColor: primary }}>
            {config.description}
          </p>
        )}

        {/* 馆长推荐 & 心动推荐 — same grid as main book list */}
        {(featuredBooks.length > 0 || topLiked.library.length > 0 || topLiked.zlib.length > 0) && (() => {
          const allTopLiked = [
            ...topLiked.library.map(b => ({ type: 'library', book: b })),
            ...topLiked.zlib.map((b, i) => ({ type: 'zlib', book: b, zlibIndex: i })),
          ]
          const visibleTop = allTopLiked.slice(0, TOP_LIKED_MAX)
          const hasMoreTop = allTopLiked.length > TOP_LIKED_MAX
          const GRID = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
          return (
            <div className="mb-8 space-y-6">
              {featuredBooks.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">⭐ 馆长推荐</p>
                  <div className={GRID}>
                    {featuredBooks.map(book => (
                      <BookCard key={book.id} book={book} isAdmin={isAdmin} featured
                        onPreview={() => setPreviewBook(book)}
                        likeCount={likeCounts.books?.[String(book.id)] || 0}
                        tags={categories.slice(1)}
                        categoryColors={categoryColors}
                        onTagChange={(id, tag) => updateBookLocally(id, { category: tag })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {allTopLiked.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">❤️ 心动推荐</p>
                  <div className={GRID}>
                    {visibleTop.map(item =>
                      item.type === 'library' ? (
                        <BookCard key={item.book.id} book={item.book} isAdmin={isAdmin}
                          onPreview={() => setPreviewBook(item.book)}
                          likeCount={likeCounts.books?.[String(item.book.id)] || 0}
                          tags={categories.slice(1)}
                          categoryColors={categoryColors}
                          onTagChange={(id, tag) => updateBookLocally(id, { category: tag })}
                        />
                      ) : (
                        <ZlibCard key={`zlib-${item.zlibIndex}`} book={item.book} index={item.zlibIndex}
                          likeCount={likeCounts.zlib?.[item.book.title] || 0}
                          className="w-full" />
                      )
                    )}
                    {hasMoreTop && (
                      <div className="aspect-[3/4] bg-slate-50 rounded-xl flex items-center justify-center">
                        <span className="text-2xl text-slate-300 tracking-widest select-none">···</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {(featuredBooks.length > 0 || topLiked.library.length > 0 || topLiked.zlib.length > 0) && (
          <div className="border-b border-slate-100 mb-5" />
        )}

        {/* Category tabs + sort controls */}
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  category === cat ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
                style={category === cat ? { backgroundColor: primary, borderColor: primary } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 bg-white border border-slate-200 rounded-full px-1 py-1">
            {[{ key: 'newest', label: '最新' }, { key: 'title', label: 'A-Z' }, { key: 'random', label: '随机' }].map(({ key, label }) => (
              <button key={key} onClick={() => setSort(key)}
                className={`px-3 py-0.5 rounded-full text-xs font-medium transition-all ${
                  sort === key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={sort === key ? { backgroundColor: primary } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className="text-sm text-slate-400 mb-4">
            共 {filtered.length} 本{search && ` · 搜索"${search}"`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="text-center"><div className="text-4xl mb-3 animate-pulse">📚</div><p>加载中...</p></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="text-center"><div className="text-4xl mb-3">🔍</div><p>未找到相关书籍</p></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(book => (
              <BookCard key={book.id} book={book} isAdmin={isAdmin}
                onPreview={() => setPreviewBook(book)}
                tags={categories.slice(1)}
                categoryColors={categoryColors}
                onTagChange={(id, tag) => updateBookLocally(id, { category: tag })}
                likeCount={likeCounts.books?.[String(book.id)] || 0}
              />
            ))}
          </div>
        )}
      </main>

      {/* Z-Library section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 mt-10">
        <div className="border-t border-slate-100 pt-8">
          {/* Search */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-base font-semibold text-slate-700 flex-shrink-0">🔍 搜索更多书籍</h2>
            <div className="flex gap-2 flex-1 max-w-lg">
              <input
                value={zlibQuery} onChange={e => setZlibQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doZlibSearch()}
                placeholder="从 Z-Library 搜索书名或作者..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 bg-white"
                style={{'--tw-ring-color': primary}}
              />
              <button onClick={doZlibSearch} disabled={zlibLoading}
                className="px-4 py-1.5 text-white text-sm rounded-lg disabled:opacity-50 transition-colors flex-shrink-0"
                style={{ backgroundColor: primary }}>
                {zlibLoading ? '搜索中...' : '搜索'}
              </button>
            </div>
          </div>

          {/* Search results */}
          {zlibResults.length > 0 && (
            <div className="mb-8">
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {zlibResults.map((book, i) => <ZlibCard key={i} book={book} index={i}
                  likeCount={likeCounts.zlib?.[book.title] || 0} />)}
              </div>
            </div>
          )}

          {/* Recommendations — single horizontal scrollable row */}
          {recsLoaded && zlibRecs.length > 0 && zlibResults.length === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-slate-700">根据馆藏推荐</span>
                <span className="text-xs text-slate-300">· Z-Library</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
                {zlibRecs.flatMap((group, gi) =>
                  group.books.map((book, i) => (
                    <ZlibCard key={`${gi}-${i}`} book={book} index={gi * 2 + i} category={group.name}
                      likeCount={likeCounts.zlib?.[book.title] || 0} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {previewBook && <PreviewModal book={previewBook} onClose={() => setPreviewBook(null)} />}

      {/* 许愿清单 — 悬浮按钮 */}
      <button
        onClick={() => { setWishOpen(true); setWishSent(false) }}
        className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full shadow-lg text-white flex items-center justify-center text-xl transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: primary }}
        title="许愿清单"
      >
        💌
      </button>

      {/* 许愿清单 — 弹窗 */}
      {wishOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setWishOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-800 mb-1">💌 许愿清单</h3>
            <p className="text-xs text-slate-400 mb-4">想找什么书，或者有什么想说的？</p>

            {wishSent ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✨</div>
                <p className="text-slate-600 font-medium">已收到，谢谢！</p>
              </div>
            ) : (
              <>
                <input
                  value={wishName}
                  onChange={e => setWishName(e.target.value)}
                  placeholder="你的名字（选填）"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primary }}
                />
                <textarea
                  value={wishContent}
                  onChange={e => setWishContent(e.target.value)}
                  placeholder="想找的书名、作者，或者留言..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 resize-none"
                  style={{ '--tw-ring-color': primary }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setWishOpen(false)}
                    className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={submitWish}
                    disabled={!wishContent.trim() || wishLoading}
                    className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: primary }}
                  >
                    {wishLoading ? '发送中...' : '发送'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { login, getMe, getBooks, deleteBook, uploadBook, getConfig, saveConfig, zlibSearch, zlibRefresh, getLikeList, getWishList, clearAllLikes } from '../api'
import { GRADIENTS } from '../components/BookCard'
import api from '../api'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const BASE_CATEGORIES = []
const ACCEPT = '.pdf,.epub,.mobi,.azw,.azw3,.cbz,.cbr,.djvu,.txt,.doc,.docx,.jpg,.jpeg,.png'

// Single file row in the batch upload list
function FileRow({ item, onChange, onRemove, categories = BASE_CATEGORIES }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      item.status === 'done' ? 'border-green-200 bg-green-50' :
      item.status === 'error' ? 'border-red-200 bg-red-50' :
      'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 w-6 flex-shrink-0 text-center">
          {item.status === 'detecting' && <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />}
          {item.status === 'pending'   && <span className="text-slate-400 text-xs">📄</span>}
          {item.status === 'uploading' && <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />}
          {item.status === 'done'      && <span className="text-green-500 text-sm">✓</span>}
          {item.status === 'error'     && <span className="text-red-500 text-sm">✕</span>}
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Title */}
          <input
            value={item.title}
            onChange={e => onChange(item.id, 'title', e.target.value)}
            placeholder="书名"
            disabled={item.status === 'done'}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
          />
          {/* Author */}
          <input
            value={item.author}
            onChange={e => onChange(item.id, 'author', e.target.value)}
            placeholder="作者"
            disabled={item.status === 'done'}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
          />
          {/* Category */}
          <select
            value={item.category}
            onChange={e => onChange(item.id, 'category', e.target.value)}
            disabled={item.status === 'done'}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400 bg-white"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase">{item.format}</span>
          {item.status !== 'done' && item.status !== 'uploading' && (
            <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
          )}
        </div>
      </div>

      {item.status === 'error' && (
        <p className="mt-2 text-xs text-red-500 ml-9">{item.error}</p>
      )}
    </div>
  )
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [loginError, setLoginError]   = useState('')
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [books, setBooks]             = useState([])
  const [showUpload, setShowUpload]   = useState(false)
  const [queue, setQueue]             = useState([])
  const [uploading, setUploading]     = useState(false)
  const [tab, setTab]                 = useState('books')
  const [likes, setLikes]             = useState([])
  const [wishes, setWishes]           = useState([])
  const [editingId, setEditingId]     = useState(null)
  const [editDraft, setEditDraft]     = useState({})
  const [showZlib, setShowZlib]       = useState(false)
  const [zlibQuery, setZlibQuery]     = useState('')
  const [zlibResults, setZlibResults] = useState([])
  const [zlibLoading, setZlibLoading] = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [cfg, setCfg]                 = useState(null)
  const [cfgSaving, setCfgSaving]     = useState(false)
  const fileInputRef = useRef()

  const THEME_COLORS = [
    { label: '雾蓝', value: '#60a5fa' },
    { label: '薰衣草', value: '#a78bfa' },
    { label: '薄荷', value: '#34d399' },
    { label: '蜜橙', value: '#fb923c' },
    { label: '藕粉', value: '#f9a8d4' },
    { label: '烟灰', value: '#94a3b8' },
  ]
  const SORT_OPTIONS = [
    { value: 'newest', label: '最新上传' },
    { value: 'title',  label: '书名 A-Z' },
    { value: 'random', label: '随机排列' },
  ]

  const loadBooks = useCallback(() => {
    getBooks().then(res => setBooks(res.data))
  }, [])

  const allCategories = useMemo(() => {
    const fromBooks = books.map(b => b.category).filter(Boolean)
    return Array.from(new Set([...BASE_CATEGORIES, ...fromBooks]))
  }, [books])

  const loadLikes = useCallback(() => {
    getLikeList().then(r => setLikes(r.data)).catch(() => setLikes([]))
  }, [])

  const loadWishes = useCallback(() => {
    getWishList().then(r => setWishes(r.data)).catch(() => setWishes([]))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    getMe().then(() => {
      setIsLoggedIn(true)
      loadBooks()
      loadLikes()
      loadWishes()
      getConfig().then(r => setCfg(r.data)).catch(() => {})
    }).catch(() => localStorage.removeItem('admin_token'))
  }, [loadBooks])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await login(username, password)
      localStorage.setItem('admin_token', res.data.access_token)
      setIsLoggedIn(true)
      loadBooks()
    } catch { setLoginError('用户名或密码错误') }
  }

  const handleLogout = () => { localStorage.removeItem('admin_token'); setIsLoggedIn(false) }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`确认删除《${title}》？`)) return
    await deleteBook(id).catch(() => alert('删除失败'))
    loadBooks()
  }

  // Add files to queue and auto-detect metadata
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const newItems = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      author: '',
      category: '其他',
      format: f.name.split('.').pop().toLowerCase(),
      status: 'detecting',
      error: '',
    }))

    setQueue(prev => [...prev, ...newItems])

    // Detect metadata for each file
    for (const item of newItems) {
      try {
        const fd = new FormData()
        fd.append('file', item.file)
        const res = await api.post('/books/detect', fd)
        const d = res.data
        setQueue(prev => prev.map(q => q.id !== item.id ? q : {
          ...q,
          title:    d.title    || q.title,
          author:   d.author   || '',
          category: d.category || '其他',
          format:   d.format   || q.format,
          status:   'pending',
        }))
      } catch {
        setQueue(prev => prev.map(q => q.id !== item.id ? q : { ...q, status: 'pending' }))
      }
    }

    e.target.value = ''
  }

  const updateItem = (id, field, value) => {
    setQueue(prev => prev.map(q => q.id !== id ? q : { ...q, [field]: value }))
  }

  const removeItem = (id) => setQueue(prev => prev.filter(q => q.id !== id))

  const uploadAll = async () => {
    const pending = queue.filter(q => q.status === 'pending')
    if (!pending.length) return
    setUploading(true)

    for (const item of pending) {
      setQueue(prev => prev.map(q => q.id !== item.id ? q : { ...q, status: 'uploading' }))
      try {
        const fd = new FormData()
        fd.append('title', item.title)
        fd.append('author', item.author)
        fd.append('category', item.category)
        fd.append('file', item.file)
        await uploadBook(fd)
        setQueue(prev => prev.map(q => q.id !== item.id ? q : { ...q, status: 'done' }))
      } catch (err) {
        const msg = err.response?.data?.detail || '上传失败'
        setQueue(prev => prev.map(q => q.id !== item.id ? q : { ...q, status: 'error', error: msg }))
      }
    }

    setUploading(false)
    loadBooks()
  }

  const clearDone = () => setQueue(prev => prev.filter(q => q.status !== 'done'))
  const pendingCount = queue.filter(q => q.status === 'pending').length

  const startEdit = (book) => {
    setEditingId(book.id)
    setEditDraft({ title: book.title, author: book.author || '', category: book.category || '' })
  }

  const saveEdit = async (id) => {
    try {
      await api.patch(`/books/${id}`, editDraft)
      setEditingId(null)
      loadBooks()
    } catch { alert('保存失败') }
  }

  const zlibDoSearch = async () => {
    if (!zlibQuery.trim()) return
    setZlibLoading(true); setZlibResults([])
    try {
      const r = await zlibSearch(zlibQuery)
      setZlibResults(r.data.results || [])
    } catch (e) {
      alert(e.response?.data?.detail || '搜索失败')
    } finally { setZlibLoading(false) }
  }

  const zlibDoRefresh = async () => {
    setRefreshing(true)
    try { await zlibRefresh(); alert('推荐已刷新！') }
    catch { alert('刷新失败') }
    finally { setRefreshing(false) }
  }

  const handleSaveConfig = async () => {
    setCfgSaving(true)
    try {
      const res = await saveConfig(cfg)
      setCfg(res.data)
    } finally { setCfgSaving(false) }
  }

  /* ── Login ── */
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📚</div>
          <h1 className="text-xl font-bold text-slate-900">管理员登录</h1>
          <p className="text-sm text-slate-400 mt-1">Anne's Library</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" required />
          </div>
          {loginError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition-colors">登录</button>
        </form>
        <Link to="/" className="block text-center text-sm text-slate-400 hover:text-slate-600 mt-5 transition-colors">← 返回图书馆首页</Link>
      </div>
    </div>
  )

  /* ── Dashboard ── */
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Anne's Library</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">查看首页</Link>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">退出登录</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
          {[
            { key: 'books',   label: '📚 书籍管理' },
            { key: 'likes',   label: '♥ 喜欢数据' },
            { key: 'wishes',  label: '💌 许愿清单' },
            { key: 'settings', label: '⚙️ 网站设置' },
          ].map(t => (
            <button key={t.key} onClick={() => {
              setTab(t.key)
              if (t.key === 'likes') loadLikes()
              if (t.key === 'wishes') loadWishes()
            }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Likes panel ── */}
        {tab === 'likes' && (() => {
          const grouped = Object.values(
            likes.reduce((acc, l) => {
              const key = l.title
              if (!acc[key]) acc[key] = { ...l, count: 0 }
              acc[key].count++
              return acc
            }, {})
          ).sort((a, b) => b.count - a.count)
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">♥ 喜欢数据</h3>
                {likes.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!window.confirm(`确认清空全部 ${likes.length} 条喜欢记录？`)) return
                      await clearAllLikes().catch(() => {})
                      loadLikes()
                    }}
                    className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    清空全部
                  </button>
                )}
              </div>
              {grouped.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">暂无喜欢记录</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-600">书名</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-600">来源</th>
                        <th className="text-right px-4 py-2.5 font-medium text-slate-600">点赞数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {grouped.map(item => (
                        <tr key={item.title} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-800">
                            {item.url
                              ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">{item.title}</a>
                              : item.title}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${item.type === 'library' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                              {item.type === 'library' ? '馆藏' : 'Z-Library'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-semibold text-rose-500">♥ {item.count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Wishes panel ── */}
        {tab === 'wishes' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">💌 许愿清单</h3>
              <span className="text-xs text-slate-400">{wishes.length} 条</span>
            </div>
            {wishes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">暂无许愿记录</p>
            ) : (
              <div className="space-y-3">
                {wishes.map(w => (
                  <div key={w.id} className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-800 leading-relaxed flex-1 whitespace-pre-wrap">{w.content}</p>
                      <span className="text-xs text-slate-300 flex-shrink-0 mt-0.5">
                        {new Date(w.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    {w.name && (
                      <p className="text-xs text-slate-400 mt-2">— {w.name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings panel ── */}
        {tab === 'settings' && cfg && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">

            {/* Title & subtitle */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">网站标题</label>
                <input value={cfg.site_title} onChange={e => setCfg({...cfg, site_title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">副标题</label>
                <input value={cfg.site_subtitle} onChange={e => setCfg({...cfg, site_subtitle: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* Announcement */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">公告栏 <span className="text-slate-400 font-normal">（留空则不显示）</span></label>
              <input value={cfg.announcement} onChange={e => setCfg({...cfg, announcement: e.target.value})}
                placeholder="例如：本周新增20本书，欢迎来看～"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">书库简介 <span className="text-slate-400 font-normal">（显示在首页分类标签上方）</span></label>
              <textarea value={cfg.description} onChange={e => setCfg({...cfg, description: e.target.value})}
                rows={2} placeholder="例如：这里收录了我精选的书单，欢迎取用。"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>

            {/* Theme color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">主题色</label>
              <div className="flex gap-2 flex-wrap">
                {THEME_COLORS.map(c => (
                  <button key={c.value} onClick={() => setCfg({...cfg, theme_color: c.value})}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      cfg.theme_color === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }} title={c.label} />
                ))}
              </div>
            </div>

            {/* Default sort */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">首页默认排序</label>
              <div className="flex gap-2">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setCfg({...cfg, default_sort: o.value})}
                    className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                      cfg.default_sort === o.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category gradient mapping */}
            {allCategories.length > 0 && (() => {
              const colors = (() => { try { return JSON.parse(cfg.category_colors || '{}') } catch { return {} } })()
              const set = (cat, name) => setCfg({ ...cfg, category_colors: JSON.stringify({ ...colors, [cat]: name }) })
              const clear = (cat) => { const c = { ...colors }; delete c[cat]; setCfg({ ...cfg, category_colors: JSON.stringify(c) }) }
              return (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    分类封面颜色 <span className="text-slate-400 font-normal">（点色块为分类指定颜色，再次点击取消）</span>
                  </label>
                  <div className="space-y-1.5">
                    {allCategories.map(cat => (
                      <div key={cat} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-700 w-24 flex-shrink-0 truncate">{cat}</span>
                        <div className="flex gap-1.5">
                          {GRADIENTS.map(g => (
                            <button key={g.name} onClick={() => colors[cat] === g.name ? clear(cat) : set(cat, g.name)}
                              title={g.name}
                              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                                colors[cat] === g.name ? 'border-slate-600 scale-110' : 'border-transparent'
                              }`}
                              style={{ background: `linear-gradient(135deg, #f8fafc, ${g.preview})` }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Featured books */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">馆长推荐 <span className="text-slate-400 font-normal">（在首页顶部展示，最多选6本）</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-3">
                {books.map(book => {
                  const ids = (() => { try { return JSON.parse(cfg.featured_book_ids || '[]') } catch { return [] } })()
                  const checked = ids.includes(book.id)
                  return (
                    <label key={book.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked ? ids.filter(i => i !== book.id) : ids.length < 6 ? [...ids, book.id] : ids
                        setCfg({...cfg, featured_book_ids: JSON.stringify(next)})
                      }} className="accent-blue-600" />
                      <span className="text-sm text-slate-700 truncate">{book.title}</span>
                      <span className="text-xs text-slate-400 ml-auto uppercase">{book.format}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Z-Library credentials */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Z-Library 账号 <span className="text-slate-400 font-normal">（用于搜索和导入书籍）</span></label>
              <div className="grid sm:grid-cols-3 gap-3">
                <input value={cfg.zlibrary_domain} onChange={e => setCfg({...cfg, zlibrary_domain: e.target.value})}
                  placeholder="https://zh.101sat.ru"
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={cfg.zlibrary_email} onChange={e => setCfg({...cfg, zlibrary_email: e.target.value})}
                  placeholder="邮箱"
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="password" value={cfg.zlibrary_password} onChange={e => setCfg({...cfg, zlibrary_password: e.target.value})}
                  placeholder="密码"
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="mt-2">
                <input value={cfg.zlibrary_cookie || ''} onChange={e => setCfg({...cfg, zlibrary_cookie: e.target.value})}
                  placeholder="Cookie（可选，填了优先使用）：remix_userid=xxx; remix_userkey=xxx"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSaveConfig} disabled={cfgSaving}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {cfgSaving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        )}

        {/* ── Books panel ── */}
        {tab === 'books' && <>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">书籍管理</h2>
            <p className="text-sm text-slate-400">共 {books.length} 本</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowZlib(!showZlib); setShowUpload(false) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${showZlib ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              📥 Z-Library
            </button>
            <button onClick={() => { setShowUpload(!showUpload); setShowZlib(false); if (!showUpload) setQueue([]) }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${showUpload ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {showUpload ? '取消' : '+ 上传书籍'}
            </button>
          </div>
        </div>

        {/* Batch upload panel */}
        {showUpload && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">批量上传</h3>
              {queue.some(q => q.status === 'done') && (
                <button onClick={clearDone} className="text-xs text-slate-400 hover:text-slate-600">清除已完成</button>
              )}
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
            >
              <div className="text-3xl mb-2">📂</div>
              <p className="text-slate-500 text-sm">点击选择文件，支持多选</p>
              <p className="text-slate-400 text-xs mt-1">PDF · EPUB · MOBI · TXT · DOC · 图片等</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={handleFilesSelected}
              className="hidden"
            />

            {/* File queue */}
            {queue.length > 0 && (
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {queue.map(item => (
                  <FileRow key={item.id} item={item} onChange={updateItem} onRemove={removeItem} categories={allCategories} />
                ))}
              </div>
            )}

            {/* Upload button */}
            {pendingCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={uploadAll}
                  disabled={uploading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {uploading ? '上传中...' : `上传全部 (${pendingCount} 本)`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Z-Library panel */}
        {showZlib && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">🔍 Z-Library 搜索</h3>
              <button onClick={zlibDoRefresh} disabled={refreshing}
                className="text-xs text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50">
                {refreshing ? '刷新中...' : '↺ 刷新首页推荐'}
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 bg-slate-50 rounded-lg px-3 py-2">
              搜索 → 点「打开」在浏览器下载文件 → 回来用「上传书籍」添加到图书馆
            </p>

            <div className="flex gap-2 mb-4">
              <input value={zlibQuery} onChange={e => setZlibQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && zlibDoSearch()}
                placeholder="输入书名或作者..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={zlibDoSearch} disabled={zlibLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 min-w-[80px]">
                {zlibLoading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    搜索中
                  </span>
                ) : '搜索'}
              </button>
            </div>

            {zlibResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {zlibResults.map(book => (
                  <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                    {book.cover
                      ? <img src={book.cover} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" onError={e => e.target.style.display='none'} />
                      : <div className="w-10 h-14 bg-slate-100 rounded flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{book.title}</p>
                      <p className="text-xs text-slate-500 truncate">{book.author}{book.year ? ` · ${book.year}` : ''}</p>
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-400 flex-shrink-0">{book.format}</span>
                    <a href={book.url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0">
                      打开
                    </a>
                  </div>
                ))}
              </div>
            )}

            {!zlibLoading && zlibResults.length === 0 && zlibQuery && (
              <p className="text-sm text-slate-400 text-center py-6">未找到结果，请尝试其他关键词</p>
            )}
          </div>
        )}

        {/* Book table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          {books.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-3xl mb-3">📭</div>
              <p>暂无书籍，点击"上传书籍"添加</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">书名</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">作者</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">分类</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">格式</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">大小</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {books.map(book => {
                  const isEditing = editingId === book.id
                  return (
                    <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                      {isEditing ? (
                        <>
                          <td className="px-3 py-2">
                            <input value={editDraft.title} onChange={e => setEditDraft({...editDraft, title: e.target.value})}
                              className="w-full border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit(book.id); if (e.key === 'Escape') setEditingId(null) }} />
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <input value={editDraft.author} onChange={e => setEditDraft({...editDraft, author: e.target.value})}
                              placeholder="作者"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell">
                            <input value={editDraft.category} onChange={e => setEditDraft({...editDraft, category: e.target.value})}
                              placeholder="分类" list="edit-cats"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            <datalist id="edit-cats">
                              {['编程技术','人工智能','系统架构','数学','文学','历史','其他'].map(c => <option key={c} value={c} />)}
                            </datalist>
                          </td>
                          <td className="px-4 py-3.5"><span className="text-xs font-bold uppercase text-slate-400">{book.format}</span></td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{formatSize(book.file_size)}</td>
                          <td className="px-3 py-2 text-right flex gap-1 justify-end">
                            <button onClick={() => saveEdit(book.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">保存</button>
                            <button onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200">取消</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3.5 font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => startEdit(book)}>
                            {book.title}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{book.author || '—'}</td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            {book.category
                              ? <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{book.category}</span>
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5"><span className="text-xs font-bold uppercase text-slate-400">{book.format}</span></td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">{formatSize(book.file_size)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => startEdit(book)}
                              className="text-slate-400 hover:text-blue-500 text-xs font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50 mr-1">
                              编辑
                            </button>
                            <button onClick={() => handleDelete(book.id, book.title)}
                              className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors px-2 py-1 rounded hover:bg-red-50">
                              删除
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        </>}
      </main>
    </div>
  )
}

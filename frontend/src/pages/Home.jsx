import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBooks } from '../api'
import BookCard from '../components/BookCard'
import PreviewModal from '../components/PreviewModal'

const CATEGORIES = ['全部', '编程技术', '人工智能', '系统架构', '数学', '文学', '其他']

export default function Home() {
  const [books, setBooks] = useState([])
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')
  const [previewBook, setPreviewBook] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getBooks(category === '全部' ? undefined : category)
      .then((res) => setBooks(res.data))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [category])

  const filtered = search.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          (b.author || '').toLowerCase().includes(search.toLowerCase())
      )
    : books

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-slate-900">Anne's Library</h1>
            <p className="text-xs text-slate-400 hidden sm:block">浏览 · 预览 · 下载</p>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书名或作者..."
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
            />
          </div>

          <Link
            to="/admin"
            className="flex-shrink-0 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
          >
            管理后台
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stats */}
        {!loading && (
          <p className="text-sm text-slate-400 mb-4">
            共 {filtered.length} 本书籍
            {search && ` · 搜索"${search}"`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-pulse">📚</div>
              <p>加载中...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p>未找到相关书籍</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPreview={() => setPreviewBook(book)}
              />
            ))}
          </div>
        )}
      </main>

      {previewBook && (
        <PreviewModal book={previewBook} onClose={() => setPreviewBook(null)} />
      )}
    </div>
  )
}

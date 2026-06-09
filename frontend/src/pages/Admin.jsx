import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { login, getMe, getBooks, deleteBook, uploadBook } from '../api'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [books, setBooks] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const loadBooks = useCallback(() => {
    getBooks().then((res) => setBooks(res.data))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    getMe()
      .then(() => {
        setIsLoggedIn(true)
        loadBooks()
      })
      .catch(() => localStorage.removeItem('admin_token'))
  }, [loadBooks])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await login(username, password)
      localStorage.setItem('admin_token', res.data.access_token)
      setIsLoggedIn(true)
      loadBooks()
    } catch {
      setLoginError('用户名或密码错误')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsLoggedIn(false)
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`确认删除《${title}》？此操作不可撤销。`)) return
    try {
      await deleteBook(id)
      loadBooks()
    } catch {
      alert('删除失败')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setUploadError('')
    setUploading(true)
    try {
      await uploadBook(new FormData(e.target))
      e.target.reset()
      setShowUpload(false)
      loadBooks()
    } catch (err) {
      setUploadError(err.response?.data?.detail || '上传失败，请检查文件格式')
    } finally {
      setUploading(false)
    }
  }

  /* ── Login screen ── */
  if (!isLoggedIn) {
    return (
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
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              登录
            </button>
          </form>
          <Link to="/" className="block text-center text-sm text-slate-400 hover:text-slate-600 mt-5 transition-colors">
            ← 返回图书馆首页
          </Link>
        </div>
      </div>
    )
  }

  /* ── Admin dashboard ── */
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Anne's Library</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              查看首页
            </Link>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">书籍管理</h2>
            <p className="text-sm text-slate-400">共 {books.length} 本</p>
          </div>
          <button
            onClick={() => { setShowUpload(!showUpload); setUploadError('') }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              showUpload
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showUpload ? '取消' : '+ 上传书籍'}
          </button>
        </div>

        {/* Upload form */}
        {showUpload && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">上传新书籍</h3>
            <form onSubmit={handleUpload}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">书名 *</label>
                  <input
                    name="title"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="输入书名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作者</label>
                  <input
                    name="author"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="输入作者名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                  <input
                    name="category"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="如：编程技术、文学"
                    list="categories"
                  />
                  <datalist id="categories">
                    <option value="编程技术" />
                    <option value="人工智能" />
                    <option value="系统架构" />
                    <option value="数学" />
                    <option value="文学" />
                    <option value="其他" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">书籍文件 *</label>
                  <input
                    name="file"
                    type="file"
                    required
                    accept=".pdf,.epub,.mobi,.azw,.azw3,.cbz,.cbr,.djvu,.txt,.doc,.docx,.jpg,.jpeg,.png"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-blue-50 file:text-blue-700 file:rounded file:px-2 file:py-0.5 file:text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">简介</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="书籍简介（可选）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">封面图片（可选）</label>
                  <input
                    name="cover"
                    type="file"
                    accept="image/*"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-slate-50 file:text-slate-600 file:rounded file:px-2 file:py-0.5 file:text-xs"
                  />
                </div>
              </div>

              {uploadError && (
                <p className="mt-3 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{uploadError}</p>
              )}

              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {uploading ? '上传中...' : '确认上传'}
                </button>
              </div>
            </form>
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
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{book.title}</td>
                    <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{book.author || '—'}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {book.category ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                          {book.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold uppercase text-slate-500">{book.format}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs hidden lg:table-cell">
                      {formatSize(book.file_size)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(book.id, book.title)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors px-2 py-1 rounded hover:bg-red-50"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

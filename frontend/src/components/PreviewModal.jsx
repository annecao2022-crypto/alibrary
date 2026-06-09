import { useEffect, useState } from 'react'
import EpubViewer from './EpubViewer'

const NEW_TAB_FORMATS = new Set(['pdf', 'mobi', 'azw', 'azw3', 'cbz', 'cbr', 'djvu', 'doc', 'docx'])
const IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png'])

export default function PreviewModal({ book, onClose }) {
  const [txtContent, setTxtContent] = useState('')
  const fmt = book.format?.toLowerCase()
  const previewUrl = `/api/books/${book.id}/preview`

  useEffect(() => {
    if (fmt === 'txt') {
      fetch(previewUrl).then((r) => r.text()).then(setTxtContent)
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [book.id, fmt, onClose, previewUrl])

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div className="min-w-0 mr-4">
            <h2 className="font-semibold text-gray-900 truncate">{book.title}</h2>
            <p className="text-sm text-gray-500 truncate">{book.author}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a
              href={`/api/books/${book.id}/download`}
              download
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
            >
              下载
            </a>
            <button onClick={onClose} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">
              ✕
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-hidden min-h-0 relative">

          {/* PDF / 不可内嵌格式 → 新标签页 */}
          {NEW_TAB_FORMATS.has(fmt) && (
            <div className="flex flex-col items-center justify-center h-full gap-5 bg-slate-50" style={{ minHeight: '60vh' }}>
              <span className="text-6xl">📄</span>
              <p className="text-slate-600 font-medium">{book.title}</p>
              <p className="text-slate-400 text-sm uppercase tracking-wide">{fmt}</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                在新标签页中预览
              </a>
            </div>
          )}

          {/* EPUB → 后端提取文字分章阅读 */}
          {fmt === 'epub' && <EpubViewer bookId={book.id} />}

          {/* 图片 */}
          {IMAGE_FORMATS.has(fmt) && (
            <div className="flex items-center justify-center h-full p-6 overflow-auto bg-gray-50">
              <img src={previewUrl} alt={book.title} className="max-w-full max-h-full object-contain rounded" />
            </div>
          )}

          {/* TXT */}
          {fmt === 'txt' && (
            <div className="overflow-auto h-full p-6 bg-gray-50" style={{ minHeight: '60vh' }}>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {txtContent || '加载中...'}
              </pre>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

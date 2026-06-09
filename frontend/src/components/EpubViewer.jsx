import { useEffect, useState, useCallback } from 'react'

export default function EpubViewer({ bookId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chapter, setChapter] = useState(0)

  const loadChapter = useCallback((ch) => {
    setLoading(true)
    fetch(`/api/books/${bookId}/epub-text?chapter=${ch}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setChapter(d.chapter) })
      .catch(() => setData({ error: true }))
      .finally(() => setLoading(false))
  }, [bookId])

  useEffect(() => { loadChapter(0) }, [loadChapter])

  const prev = () => { if (chapter > 0) loadChapter(chapter - 1) }
  const next = () => { if (data && chapter < data.total - 1) loadChapter(chapter + 1) }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-4 bg-slate-50" style={{ minHeight: '65vh' }}>
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">加载章节中...</p>
    </div>
  )

  if (!data || data.error) return (
    <div className="flex flex-col items-center justify-center gap-4 bg-slate-50" style={{ minHeight: '65vh' }}>
      <span className="text-5xl">📚</span>
      <p className="text-slate-500">内容解析失败，请下载后用阅读器打开</p>
    </div>
  )

  return (
    <div className="flex flex-col" style={{ minHeight: '70vh' }}>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-amber-50" style={{ maxHeight: '65vh', fontFamily: 'Georgia, serif' }}>
        <div className="max-w-2xl mx-auto">
          {data.content
            ? data.content.split('\n').map((line, i) => (
                <p key={i} className="mb-3 leading-8 text-gray-800 text-base">
                  {line || <br />}
                </p>
              ))
            : <p className="text-slate-400 text-center mt-20">本章节无文字内容</p>
          }
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center px-6 py-3 border-t bg-white flex-shrink-0">
        <button
          onClick={prev}
          disabled={chapter === 0}
          className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
        >
          ← 上一章
        </button>
        <span className="text-xs text-slate-400">第 {chapter + 1} 章 / 共 {data.total} 章</span>
        <button
          onClick={next}
          disabled={chapter >= data.total - 1}
          className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
        >
          下一章 →
        </button>
      </div>
    </div>
  )
}

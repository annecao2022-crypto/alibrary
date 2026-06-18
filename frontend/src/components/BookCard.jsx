import { useState, useRef, useEffect } from 'react'
import { updateBook } from '../api'
import LikeButton from './LikeButton'

const FORMAT_COLORS = {
  pdf:  'bg-slate-100 text-slate-500',
  epub: 'bg-slate-100 text-slate-500',
  txt:  'bg-slate-100 text-slate-500',
  mobi: 'bg-slate-100 text-slate-500',
  jpg:  'bg-slate-100 text-slate-500',
  jpeg: 'bg-slate-100 text-slate-500',
  png:  'bg-slate-100 text-slate-500',
}

export const GRADIENTS = [
  { name: 'blue',    cls: 'from-slate-100 to-blue-100',   preview: '#bfdbfe' },
  { name: 'amber',   cls: 'from-stone-100 to-amber-100',  preview: '#fde68a' },
  { name: 'rose',    cls: 'from-slate-100 to-rose-100',   preview: '#fecdd3' },
  { name: 'emerald', cls: 'from-zinc-100 to-emerald-100', preview: '#a7f3d0' },
  { name: 'violet',  cls: 'from-slate-100 to-violet-100', preview: '#ddd6fe' },
  { name: 'sky',     cls: 'from-stone-100 to-sky-100',    preview: '#bae6fd' },
]

const DEFAULT_TAGS = []
const PREVIEWABLE = new Set(['pdf', 'epub', 'mobi', 'azw', 'azw3', 'cbz', 'cbr', 'djvu', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'])

function TagEditor({ bookId, current, tags = DEFAULT_TAGS, onSave, onClose }) {
  const [value, setValue] = useState(current || '')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const save = async (tag) => {
    const trimmed = (tag ?? value).trim()
    if (!trimmed) return onClose()
    try {
      await updateBook(bookId, { category: trimmed })
      onSave(trimmed)
    } catch { onClose() }
  }

  return (
    <div className="mt-2" onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose() }}
        onBlur={() => setTimeout(onClose, 150)}
        placeholder="输入标签..."
        className="w-full border border-blue-400 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <div className="flex flex-wrap gap-1 mt-1.5">
        {tags.map(tag => (
          <button
            key={tag}
            onMouseDown={() => save(tag)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded-full text-xs transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BookCard({ book, isAdmin, featured, likeCount = 0, tags, categoryColors = {}, onPreview, onTagChange }) {
  const [editing, setEditing] = useState(false)
  const fmt = book.format?.toLowerCase()
  const canPreview = PREVIEWABLE.has(fmt)
  const gradient = GRADIENTS.find(g => g.name === categoryColors[book.category])?.cls
    ?? GRADIENTS[book.id % GRADIENTS.length].cls

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer">
      {/* Cover */}
      <div className={`aspect-[3/4] bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <img
          src={`/api/books/${book.id}/cover`}
          alt={book.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {canPreview && (
            <button onClick={onPreview} className="px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-100 transition-colors">
              预览
            </button>
          )}
          <a href={`/api/books/${book.id}/download`} download onClick={e => e.stopPropagation()}
            className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            下载
          </a>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
          <span className="text-xs font-semibold text-center leading-snug line-clamp-4 text-slate-700">{book.title}</span>
        </div>
        <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-bold uppercase ${FORMAT_COLORS[fmt] || 'bg-gray-100 text-gray-600'}`}>
          {book.format?.toUpperCase()}
        </span>
        {featured && <span className="absolute top-2 right-2 text-sm drop-shadow">⭐</span>}
      </div>

      {/* Metadata */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 truncate leading-snug" title={book.title}>{book.title}</h3>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 truncate flex-1">{book.author || '未知作者'}</p>
          <LikeButton bookId={book.id} count={likeCount} />
        </div>

        {/* Tag — clickable for admin */}
        {!editing ? (
          <div className="mt-2 flex items-center gap-1">
            <span
              onClick={isAdmin ? (e => { e.stopPropagation(); setEditing(true) }) : undefined}
              className={`inline-block px-2 py-0.5 rounded-full text-xs transition-colors ${
                book.category ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'
              } ${isAdmin ? 'cursor-pointer hover:bg-blue-100 hover:text-blue-600' : ''}`}
            >
              {book.category || (isAdmin ? '+ 添加标签' : '')}
            </span>
            {isAdmin && book.category && (
              <button onClick={e => { e.stopPropagation(); setEditing(true) }}
                className="text-slate-300 hover:text-blue-400 transition-colors text-xs leading-none">
                ✎
              </button>
            )}
          </div>
        ) : (
          <TagEditor
            bookId={book.id}
            current={book.category}
            tags={tags}
            onSave={tag => { onTagChange(book.id, tag); setEditing(false) }}
            onClose={() => setEditing(false)}
          />
        )}
      </div>
    </div>
  )
}

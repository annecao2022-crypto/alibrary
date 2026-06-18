import { useState, useEffect } from 'react'
import { addLike } from '../api'

function storageKey(bookId, zlibTitle) {
  return bookId ? `liked_book_${bookId}` : `liked_zlib_${encodeURIComponent(zlibTitle)}`
}

export default function LikeButton({ bookId, zlibTitle, zlibUrl, count = 0, onClick }) {
  const key = storageKey(bookId, zlibTitle)
  const [liked, setLiked] = useState(() => localStorage.getItem(key) === '1')
  const [n, setN] = useState(count)

  useEffect(() => { setN(count) }, [count])

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!liked) localStorage.setItem(key, '1')
    setLiked(true)
    setN(v => v + 1)
    try {
      await addLike(bookId ? { book_id: bookId } : { zlib_title: zlibTitle, zlib_url: zlibUrl })
    } catch { /* silent */ }
    onClick?.()
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
        liked
          ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
          : 'text-slate-400 hover:text-rose-400 hover:bg-rose-50'
      }`}
    >
      <span className="text-sm leading-none">{liked ? '♥' : '♡'}</span>
      {n > 0 && <span className="font-medium">{n}</span>}
    </button>
  )
}

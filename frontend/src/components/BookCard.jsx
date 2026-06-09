const FORMAT_COLORS = {
  pdf:  'bg-red-100 text-red-700',
  epub: 'bg-green-100 text-green-700',
  txt:  'bg-gray-100 text-gray-700',
  mobi: 'bg-blue-100 text-blue-700',
  jpg:  'bg-yellow-100 text-yellow-700',
  jpeg: 'bg-yellow-100 text-yellow-700',
  png:  'bg-purple-100 text-purple-700',
}

const COVER_GRADIENTS = [
  'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-600',
  'from-violet-400 to-purple-600',
  'from-sky-400 to-cyan-600',
]

const PREVIEWABLE = new Set(['pdf', 'epub', 'mobi', 'azw', 'azw3', 'cbz', 'cbr', 'djvu', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'])

export default function BookCard({ book, onPreview }) {
  const fmt = book.format?.toLowerCase()
  const canPreview = PREVIEWABLE.has(fmt)
  const gradient = COVER_GRADIENTS[book.id % COVER_GRADIENTS.length]

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer">
      {/* Cover area */}
      <div className={`aspect-[3/4] bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <img
          src={`/api/books/${book.id}/cover`}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none' }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {canPreview && (
            <button
              onClick={onPreview}
              className="px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-100 transition-colors"
            >
              预览
            </button>
          )}
          <a
            href={`/api/books/${book.id}/download`}
            download
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            下载
          </a>
        </div>

        {/* Default cover text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-white opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
          <span className="text-3xl mb-2">📖</span>
          <span className="text-xs font-semibold text-center leading-tight line-clamp-3 text-white/90">
            {book.title}
          </span>
        </div>

        {/* Format badge */}
        <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-bold uppercase ${FORMAT_COLORS[fmt] || 'bg-gray-100 text-gray-600'}`}>
          {book.format?.toUpperCase()}
        </span>
      </div>

      {/* Metadata */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 truncate leading-snug" title={book.title}>
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 truncate mt-0.5">{book.author || '未知作者'}</p>
        {book.category && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
            {book.category}
          </span>
        )}
      </div>
    </div>
  )
}

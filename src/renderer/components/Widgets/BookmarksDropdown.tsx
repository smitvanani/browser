import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const browserAPI = () => (window as any).browserAPI

const BookmarksDropdown: React.FC = () => {
  const { bookmarks, navigate } = useBrowser()
  const [visible, setVisible] = useState(false)
  const [filter, setFilter] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Listen for 'bookmarks' shortcut from menu
  useEffect(() => {
    const handler = () => {
      setVisible(v => {
        const next = !v
        const api = browserAPI()
        if (next) { api?.overlayShow() } else { api?.overlayHide() }
        return next
      })
    }
    window.addEventListener('toggle-bookmarks', handler)
    return () => window.removeEventListener('toggle-bookmarks', handler)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (visible) { setVisible(false); browserAPI()?.overlayHide() }
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [visible])

  const handleBookmarkClick = useCallback((url: string) => {
    navigate(url)
    setVisible(false)
    browserAPI()?.overlayHide()
  }, [navigate])

  const handleRemove = useCallback(async (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    const api = (window as any).browserAPI
    if (api) {
      await api.removeBookmark(url)
    }
  }, [])

  const toggleVisible = useCallback(() => {
    setVisible(prev => !prev)
    setFilter('')
  }, [])

  const getFaviconUrl = (url: string): string => {
    try {
      const domain = new URL(url).origin
      return `${domain}/favicon.ico`
    } catch {
      return ''
    }
  }

  const filteredBookmarks = bookmarks.filter(bm => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return bm.title.toLowerCase().includes(q) || bm.url.toLowerCase().includes(q)
  })

  return (
    <div
      ref={dropdownRef}
      className={`bookmarks-dropdown${visible ? ' visible' : ''}`}
    >
      <input
        type="text"
        placeholder="Search bookmarks..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          marginBottom: '4px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--sidebar-hover)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {filteredBookmarks.length === 0 && (
        <div style={{
          padding: '12px 10px',
          fontSize: '11px',
          color: 'var(--text-hint)',
          textAlign: 'center',
        }}>
          {bookmarks.length === 0 ? 'No bookmarks yet' : 'No matches found'}
        </div>
      )}
      {filteredBookmarks.map(bm => (
        <div
          key={bm.url}
          className="bm-item"
          onClick={() => handleBookmarkClick(bm.url)}
        >
          <img
            src={getFaviconUrl(bm.url)}
            alt=""
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bm.title || bm.url}
          </span>
          <button
            onClick={e => handleRemove(e, bm.url)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-placeholder)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 2px',
              borderRadius: '4px',
              opacity: 0,
              transition: 'opacity 0.15s',
              lineHeight: 1,
            }}
            className="bm-delete-btn"
            title="Remove bookmark"
          >
            &times;
          </button>
        </div>
      ))}
      <style>{`
        .bm-item:hover .bm-delete-btn { opacity: 1 !important; }
        .bm-delete-btn:hover { color: var(--text-primary) !important; background: var(--sidebar-hover); }
      `}</style>
    </div>
  )
}

export default BookmarksDropdown
export { BookmarksDropdown }

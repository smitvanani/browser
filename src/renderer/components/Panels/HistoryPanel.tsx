import React, { useState, useEffect, useCallback } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const api = () => (window as any).browserAPI

interface HistoryItem {
  id: string
  url: string
  title: string
  timestamp: number
}


function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function groupByDate(items: HistoryItem[]): Record<string, HistoryItem[]> {
  const groups: Record<string, HistoryItem[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000

  for (const item of items) {
    const itemDate = new Date(item.timestamp)
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime()
    let label: string
    if (itemDay === today) label = 'Today'
    else if (itemDay === yesterday) label = 'Yesterday'
    else label = itemDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  }
  return groups
}

export default function HistoryPanel() {
  const { navigate, historyPanelVisible, toggleHistoryPanel } = useBrowser()
  const visible = historyPanelVisible
  const [items, setItems] = useState<HistoryItem[]>([])
  const [query, setQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const fetchHistory = useCallback(() => {
    const b = api()
    if (!b?.getHistory) return
    b.getHistory(query).then((data: HistoryItem[]) => {
      setItems(data || [])
    })
  }, [query])

  useEffect(() => {
    if (!visible) return
    fetchHistory()
  }, [visible, fetchHistory])

  const handleDelete = async (id: string) => {
    const b = api()
    if (!b?.deleteHistory) return
    await b.deleteHistory(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleClearAll = async () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return }
    const b = api()
    if (!b?.clearHistory) return
    await b.clearHistory()
    setItems([])
    setConfirmClear(false)
  }

  const handleNavigate = (url: string) => {
    navigate(url)
    toggleHistoryPanel()
  }

  const grouped = groupByDate(items)

  return (
    <div className={'history-panel' + (visible ? ' visible' : '')}>
      {/* Header */}
      <div className="panel-header">
        <h3>History</h3>
        <button className="panel-close-btn" onClick={toggleHistoryPanel}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px 0' }}>
        <input
          type="text"
          className="panel-search"
          placeholder="Search history..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Body */}
      <div className="panel-body">
        {items.length === 0 ? (
          <div className="panel-empty">No history found</div>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div className="history-date-label">{date}</div>
              <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
                {entries.map((item) => (
                  <div
                    key={item.id}
                    className="history-item"
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleNavigate(item.url)}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${getDomain(item.url)}&sz=32`}
                      alt=""
                      style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="history-item-title">
                        {item.title || getDomain(item.url)}
                      </div>
                      <div className="history-item-domain">
                        {getDomain(item.url)}
                      </div>
                    </div>
                    <span className="history-item-time">{formatTime(item.timestamp)}</span>
                    {hoveredId === item.id && (
                      <button
                        className="history-item-delete"
                        onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                        title="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear All */}
      {items.length > 0 && (
        <div className="panel-footer">
          <button
            className={'clear-all-btn' + (confirmClear ? ' confirming' : '')}
            onClick={handleClearAll}
          >
            {confirmClear ? 'Click again to confirm' : 'Clear All History'}
          </button>
        </div>
      )}
    </div>
  )
}

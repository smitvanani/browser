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
    const b = api()
    if (!b?.clearHistory) return
    await b.clearHistory()
    setItems([])
  }

  const handleNavigate = (url: string) => {
    navigate(url)
    toggleHistoryPanel()
  }

  const grouped = groupByDate(items)

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '90%', height: '100%',
        background: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)',
        zIndex: 253, transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 20px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>History</h3>
        <button
          onClick={toggleHistoryPanel}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-hint)',
            fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--sidebar-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px 0' }}>
        <input
          type="text"
          placeholder="Search history..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', background: 'var(--card-bg)',
            fontSize: 13, fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-hint)', fontSize: 13 }}>
            No history found
          </div>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-hint)',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, padding: '0 4px',
              }}>
                {date}
              </div>
              <div className="s-card" style={{ padding: 0, overflow: 'hidden' }}>
                {entries.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: hoveredId === item.id ? 'var(--sidebar-hover)' : 'transparent',
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                    }}
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
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.title || getDomain(item.url)}
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text-hint)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {getDomain(item.url)}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-hint)', flexShrink: 0 }}>
                      {formatTime(item.timestamp)}
                    </span>
                    {hoveredId === item.id && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                        style={{
                          background: 'transparent', border: 'none', color: 'var(--text-hint)',
                          cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: 14,
                          flexShrink: 0, lineHeight: 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f5576c'; e.currentTarget.style.background = 'var(--sidebar-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'transparent' }}
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
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleClearAll}
            style={{
              width: '100%', padding: '10px 0', border: 'none', borderRadius: 'var(--radius-md)',
              background: 'var(--sidebar-hover)', color: '#f5576c',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5576c'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = '#f5576c' }}
          >
            Clear All History
          </button>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const browserAPI = () => (window as any).browserAPI

interface DownloadItem {
  id: string
  filename: string
  path: string
  url: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startTime: number
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (itemDay === today) return `Today, ${time}`
  if (itemDay === today - 86400000) return `Yesterday, ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + `, ${time}`
}

export default function DownloadsPanel() {
  const { downloadsPanelVisible, toggleDownloadsPanel } = useBrowser()
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Fetch downloads when panel opens
  useEffect(() => {
    if (!downloadsPanelVisible) return
    const b = browserAPI()
    if (!b?.getDownloads) return
    b.getDownloads().then((data: DownloadItem[]) => {
      setDownloads(data || [])
    })
  }, [downloadsPanelVisible])

  // Listen for live download updates
  useEffect(() => {
    const b = browserAPI()
    if (!b?.onDownloadUpdate) return
    b.onDownloadUpdate((data: { downloads: DownloadItem[] }) => {
      setDownloads(data.downloads || [])
    })
  }, [])

  const visible = downloadsPanelVisible

  const handleOpen = (filePath: string) => {
    const b = browserAPI()
    if (b?.openDownload) b.openDownload(filePath)
  }

  const handleShowInFolder = (filePath: string) => {
    const b = browserAPI()
    if (b?.showDownload) b.showDownload(filePath)
  }

  const statusColor = (state: string) => {
    switch (state) {
      case 'completed': return '#43e97b'
      case 'progressing': return 'var(--accent, #667eea)'
      case 'cancelled': return 'var(--text-hint)'
      case 'interrupted': return '#f5576c'
      default: return 'var(--text-hint)'
    }
  }

  const statusLabel = (state: string) => {
    switch (state) {
      case 'completed': return 'Completed'
      case 'progressing': return 'Downloading...'
      case 'cancelled': return 'Cancelled'
      case 'interrupted': return 'Failed'
      default: return state
    }
  }

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
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Downloads</h3>
        <button
          onClick={toggleDownloadsPanel}
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

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {downloads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-hint)', fontSize: 13 }}>
            No downloads yet
          </div>
        ) : (
          downloads.map(item => {
            const progress = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0

            return (
              <div
                key={item.id}
                className="s-card"
                style={{
                  padding: '14px 16px', marginBottom: 8,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* File icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: 'var(--sidebar-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 16, color: 'var(--text-secondary)',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Filename */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {item.filename}
                    </div>

                    {/* Size & status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>
                        {item.state === 'progressing'
                          ? `${formatBytes(item.receivedBytes)} / ${formatBytes(item.totalBytes)}`
                          : formatBytes(item.totalBytes)}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: statusColor(item.state),
                        textTransform: 'uppercase', letterSpacing: 0.3,
                      }}>
                        {statusLabel(item.state)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {item.state === 'progressing' && (
                      <div style={{
                        marginTop: 8, height: 4, borderRadius: 2,
                        background: 'var(--sidebar-hover)', overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progress}%`, height: '100%', borderRadius: 2,
                          background: 'var(--accent, #667eea)',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    )}

                    {/* Date */}
                    {item.startTime && (
                      <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 6 }}>
                        {formatDate(item.startTime)}
                      </div>
                    )}

                    {/* Action buttons for completed downloads */}
                    {item.state === 'completed' && hoveredId === item.id && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => handleOpen(item.path)}
                          style={{
                            padding: '5px 14px', border: 'none', borderRadius: 'var(--radius-md)',
                            background: 'var(--accent, #667eea)', color: '#fff',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            transition: 'filter 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
                          onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleShowInFolder(item.path)}
                          style={{
                            padding: '5px 14px', border: 'none', borderRadius: 'var(--radius-md)',
                            background: 'var(--sidebar-hover)', color: 'var(--text-secondary)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--content-bg)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--sidebar-hover)' }}
                        >
                          Show in Folder
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

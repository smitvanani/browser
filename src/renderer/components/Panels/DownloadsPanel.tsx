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

function statusColor(state: string): string {
  switch (state) {
    case 'completed': return '#43e97b'
    case 'progressing': return 'var(--accent, #667eea)'
    case 'cancelled': return 'var(--text-hint)'
    case 'interrupted': return '#f5576c'
    default: return 'var(--text-hint)'
  }
}

function statusLabel(state: string): string {
  switch (state) {
    case 'completed': return 'Completed'
    case 'progressing': return 'Downloading...'
    case 'cancelled': return 'Cancelled'
    case 'interrupted': return 'Failed'
    default: return state
  }
}

export default function DownloadsPanel() {
  const { downloadsPanelVisible, toggleDownloadsPanel } = useBrowser()
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (!downloadsPanelVisible) return
    const b = browserAPI()
    if (!b?.getDownloads) return
    b.getDownloads().then((data: DownloadItem[]) => {
      setDownloads(data || [])
    })
  }, [downloadsPanelVisible])

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

  return (
    <div className={'downloads-panel' + (visible ? ' visible' : '')}>
      {/* Header */}
      <div className="panel-header">
        <h3>Downloads</h3>
        <button className="panel-close-btn" onClick={toggleDownloadsPanel}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Body */}
      <div className="panel-body">
        {downloads.length === 0 ? (
          <div className="panel-empty">No downloads yet</div>
        ) : (
          downloads.map(item => {
            const progress = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0

            return (
              <div
                key={item.id}
                className="s-card dl-item"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="dl-item-row">
                  <div className="dl-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dl-filename">{item.filename}</div>

                    <div className="dl-meta">
                      <span className="dl-size">
                        {item.state === 'progressing'
                          ? `${formatBytes(item.receivedBytes)} / ${formatBytes(item.totalBytes)}`
                          : formatBytes(item.totalBytes)}
                      </span>
                      <span className="dl-status" style={{ color: statusColor(item.state) }}>
                        {statusLabel(item.state)}
                      </span>
                    </div>

                    {item.state === 'progressing' && (
                      <div className="dl-progress">
                        <div className="dl-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    )}

                    {item.startTime && (
                      <div className="dl-date">{formatDate(item.startTime)}</div>
                    )}

                    {item.state === 'completed' && hoveredId === item.id && (
                      <div className="dl-actions">
                        <button className="dl-action-btn dl-action-primary" onClick={() => handleOpen(item.path)}>
                          Open
                        </button>
                        <button className="dl-action-btn dl-action-secondary" onClick={() => handleShowInFolder(item.path)}>
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

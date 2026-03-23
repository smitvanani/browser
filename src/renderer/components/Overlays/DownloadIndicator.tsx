import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

interface DownloadIndicatorProps {
  sidebarWidth: number
}

const DownloadIndicator: React.FC<DownloadIndicatorProps> = ({ sidebarWidth }) => {
  const { downloads, settings } = useBrowser()

  const activeDownloads = downloads.filter(d => d.state === 'progressing')
  const isActive = activeDownloads.length > 0

  const current = isActive ? activeDownloads[activeDownloads.length - 1] : null
  const percentage = current && current.total > 0
    ? Math.round((current.received / current.total) * 100)
    : 0

  return (
    <div
      className={`download-indicator${isActive ? ' active' : ''}`}
      style={{ left: sidebarWidth + 10 + 'px' }}
    >
      <span>{'\u2B07'}</span>
      <div className="download-bar">
        <div
          className="download-bar-fill"
          style={{
            width: percentage + '%',
            background: `var(--accent, ${settings.accentColor || 'linear-gradient(90deg,#667eea,#764ba2)'})`,
          }}
        />
      </div>
      <span className="download-text">
        {current ? `${current.filename.slice(0, 20)} ${percentage}%` : ''}
      </span>
    </div>
  )
}

export default DownloadIndicator

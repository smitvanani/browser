import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

interface LoadingBarProps {
  sidebarWidth: number
}

const LoadingBar: React.FC<LoadingBarProps> = ({ sidebarWidth }) => {
  const { isLoading, settings } = useBrowser()

  return (
    <div
      className={`loading-bar${isLoading ? ' active' : ''}`}
      style={{ left: sidebarWidth + 'px' }}
    >
      <div
        className="loading-bar-inner"
        style={{
          background: `linear-gradient(90deg, transparent, ${settings.accentColor || '#667eea'}, transparent)`,
        }}
      />
    </div>
  )
}

export default LoadingBar

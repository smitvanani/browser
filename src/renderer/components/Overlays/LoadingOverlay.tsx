import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

interface LoadingOverlayProps {
  sidebarWidth: number
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ sidebarWidth }) => {
  const { isLoading } = useBrowser()

  return (
    <div
      className={`loading-overlay${isLoading ? ' active' : ''}`}
      style={{ left: sidebarWidth + 'px' }}
    >
      <div className="loading-spinner" />
      <span className="loading-text">loading...</span>
    </div>
  )
}

export default LoadingOverlay

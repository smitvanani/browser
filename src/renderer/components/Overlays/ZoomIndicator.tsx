import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const ZoomIndicator: React.FC = () => {
  const { zoomLevel } = useBrowser()

  if (zoomLevel === null) return null

  const percentage = Math.round(100 * Math.pow(1.2, zoomLevel))

  return (
    <div className="zoom-indicator visible">
      {percentage}%
    </div>
  )
}

export default ZoomIndicator

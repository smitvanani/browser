import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const ScreenshotFlash: React.FC = () => {
  const { screenshotFlash } = useBrowser()

  return (
    <div
      className="screenshot-flash"
      style={screenshotFlash ? { animation: 'flashAnim 0.3s ease' } : undefined}
    />
  )
}

export default ScreenshotFlash

import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

interface SplitDividerProps {
  sidebarWidth: number
}

const SplitDivider: React.FC<SplitDividerProps> = ({ sidebarWidth }) => {
  const { splitActive } = useBrowser()

  if (!splitActive) return null

  return (
    <div
      className="split-divider active"
      style={{ left: `calc(${sidebarWidth}px + 50%)` }}
    />
  )
}

export default SplitDivider

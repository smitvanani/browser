import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

export default function NewTabButton() {
  const { createTab } = useBrowser()

  return (
    <button className="new-tab-btn" onClick={() => createTab()}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="new-tab-btn-label">New Tab</span>
    </button>
  )
}

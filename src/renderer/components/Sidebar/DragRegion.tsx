import React, { useMemo } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

function getDomain(url: string): string {
  if (!url || url.startsWith('file://')) return ''
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function isSecure(url: string): boolean {
  return url.startsWith('https://')
}

export default function DragRegion() {
  const { goBack, goForward, reload, toggleSidebar, sidebarCollapsed, showUrlBar, tabs, activeTabId, isLoading } = useBrowser()

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId])
  const domain = activeTab ? getDomain(activeTab.url) : ''
  const secure = activeTab ? isSecure(activeTab.url) : false
  const isNewTab = !domain

  return (
    <div className="drag-region">
      <div className="nav-bar">
        {/* Nav buttons */}
        <div className="nav-buttons">
          <button className="nav-btn" title="Back" onClick={goBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button className="nav-btn" title="Forward" onClick={goForward}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button className="nav-btn" title={isLoading ? 'Stop' : 'Reload'} onClick={reload}>
            {isLoading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            )}
          </button>
        </div>

        {/* URL display — click to open URL bar */}
        {!isNewTab && (
          <button className="nav-url-display" onClick={showUrlBar} title={activeTab?.url || ''}>
            {secure && (
              <svg className="nav-lock" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-2 0V7a5 5 0 00-10 0v4"/>
              </svg>
            )}
            <span className="nav-domain">{domain}</span>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          className="nav-btn nav-collapse"
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          onClick={toggleSidebar}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : undefined, transition: 'transform 0.3s ease' }}>
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

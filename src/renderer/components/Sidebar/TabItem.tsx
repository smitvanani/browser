import React, { useState, useCallback } from 'react'
import { useBrowser } from '../../hooks/useBrowser'
import type { TabInfo } from '../../types'

function isNewTabUrl(url: string): boolean {
  return !url || url.startsWith('file://')
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function getDomainColor(domain: string): string {
  const colors = ['#f5576c', '#fda085', '#a6e3a1', '#667eea', '#764ba2', '#ffd93d', '#89f7fe', '#fbc2eb']
  let h = 0
  for (let i = 0; i < domain.length; i++) {
    h = domain.charCodeAt(i) + ((h << 5) - h)
  }
  return colors[Math.abs(h) % colors.length]
}

function getFaviconUrl(url: string): string {
  if (!url || url.startsWith('file://')) return ''
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
  } catch {
    return ''
  }
}

interface TabItemProps {
  tab: TabInfo
}

export default function TabItem({ tab }: TabItemProps) {
  const { activeTabId, switchTab, closeTab, pinTab, createTab, showContextMenu } = useBrowser()
  const [faviconError, setFaviconError] = useState(false)

  const isActive = tab.id === activeTabId
  // Prefer the favicon from the page itself (pushed via page-favicon-updated), fall back to Google
  const faviconUrl = tab.favicon || getFaviconUrl(tab.url)
  // Reset error state when favicon changes
  const prevFavicon = React.useRef(faviconUrl)
  React.useEffect(() => {
    if (prevFavicon.current !== faviconUrl) { setFaviconError(false); prevFavicon.current = faviconUrl }
  }, [faviconUrl])
  const domain = getDomain(tab.url)
  const displayTitle = isNewTabUrl(tab.url) ? 'New Tab' : tab.title

  const handleClick = useCallback(() => {
    switchTab(tab.id)
  }, [switchTab, tab.id])

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    closeTab(tab.id)
  }, [closeTab, tab.id])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    showContextMenu(e.clientX, e.clientY, [
      {
        label: tab.pinned ? 'Unpin Tab' : 'Pin Tab',
        action: () => pinTab(tab.id, !tab.pinned),
      },
      {
        label: 'Duplicate Tab',
        action: () => createTab(tab.url),
      },
      { label: '', separator: true },
      {
        label: 'Reload',
        action: () => {
          const api = (window as any).browserAPI
          if (api) api.reload()
        },
      },
      { label: '', separator: true },
      {
        label: 'Close Tab',
        shortcut: '\u2318W',
        danger: true,
        action: () => closeTab(tab.id),
      },
      {
        label: 'Close Others',
        danger: true,
        action: () => {
          const api = (window as any).browserAPI
          if (api && api.closeOtherTabs) {
            api.closeOtherTabs(tab.id)
          }
        },
      },
    ])
  }, [showContextMenu, tab, pinTab, createTab, closeTab])

  const className = 'tab' + (isActive ? ' active' : '') + (tab.pinned ? ' pinned' : '') + (tab.suspended ? ' suspended' : '')

  return (
    <div className={className} onClick={handleClick} onContextMenu={handleContextMenu}>
      {faviconUrl && !faviconError ? (
        <img
          className="tab-favicon"
          src={faviconUrl}
          onError={() => setFaviconError(true)}
          alt=""
        />
      ) : faviconUrl && faviconError ? (
        <div
          className="tab-favicon-fallback"
          style={{ background: getDomainColor(domain) }}
        >
          {(domain[0] || '?').toUpperCase()}
        </div>
      ) : (
        <div
          className="tab-favicon-fallback"
          style={{ background: 'var(--accent, #667eea)', color: '#fff' }}
        >
          {isNewTabUrl(tab.url) ? '\u2726' : '+'}
        </div>
      )}
      <span className="tab-title">{displayTitle}</span>
      {tab.audible && (
        <span
          className="tab-audio-icon"
          title="Mute tab"
          onClick={(e) => { e.stopPropagation(); const api = (window as any).browserAPI; if (api?.muteTab) api.muteTab(tab.id) }}
        >
          {'\u{1F50A}'}
        </span>
      )}
      <button className="tab-close" onClick={handleClose}>
        &times;
      </button>
    </div>
  )
}

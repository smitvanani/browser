import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

export default function SidebarActions() {
  const { toggleAiPanel, showSettingsPanel, darkMode, toggleTheme, adBlockCount } = useBrowser()

  return (
    <div className="sidebar-actions">
      <button className="action-btn" onClick={toggleAiPanel}>
        <span
          className="action-btn-icon"
          style={{
            background: 'linear-gradient(135deg, var(--accent, #667eea), #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          &#x2728;
        </span>
        <span className="action-btn-label">Nova AI</span>
        <span
          className="action-btn-shortcut"
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            color: 'var(--text-placeholder)',
            fontFamily: "'SF Mono', monospace",
          }}
        >
          &#x2318;J
        </span>
      </button>
      <button className="action-btn" onClick={showSettingsPanel}>
        <span className="action-btn-icon">&#x2699;</span>
        <span className="action-btn-label">Settings</span>
        <span
          className="action-btn-shortcut"
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            color: 'var(--text-placeholder)',
            fontFamily: "'SF Mono', monospace",
          }}
        >
          &#x2318;,
        </span>
      </button>
      <div
        className="sidebar-bottom-info"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          fontSize: '10px',
          color: 'var(--text-placeholder)',
        }}
      >
        <span
          id="dark-mode-toggle"
          onClick={toggleTheme}
          style={{
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'transform 0.3s',
            display: 'flex',
          }}
          title="Toggle dark mode"
        >
          {darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </span>
        <span style={{ flex: 1 }} />
        <span
          id="blocked-total"
          style={{
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
          title="Total trackers blocked"
        >
          {'\uD83D\uDEE1'} <span style={{ fontWeight: 600 }}>{adBlockCount}</span> blocked
        </span>
      </div>
    </div>
  )
}

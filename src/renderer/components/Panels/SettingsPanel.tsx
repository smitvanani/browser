import React, { useState, useRef } from 'react'
import { useBrowser } from '../../hooks/useBrowser'
import type { QuickLink } from '../../types'

interface SettingsPanelProps {
  sidebarWidth: number
}

const ACCENT_COLORS = [
  { color: '#667eea', name: 'Indigo' },
  { color: '#f5576c', name: 'Coral' },
  { color: '#4facfe', name: 'Sky' },
  { color: '#43e97b', name: 'Mint' },
  { color: '#fa709a', name: 'Rose' },
  { color: '#fee140', name: 'Lemon' },
  { color: '#a18cd1', name: 'Lavender' },
  { color: '#fbc2eb', name: 'Pink' },
  { color: '#ff9a9e', name: 'Peach' },
  { color: '#00c6fb', name: 'Cyan' },
  { color: '#764ba2', name: 'Grape' },
  { color: '#89f7fe', name: 'Aqua' },
]

const SEARCH_ENGINES = [
  { value: 'google', label: 'Google', icon: 'G', desc: 'The classic' },
  { value: 'duckduckgo', label: 'DuckDuckGo', icon: 'D', desc: 'Privacy first' },
  { value: 'bing', label: 'Bing', icon: 'B', desc: 'AI-powered' },
  { value: 'brave', label: 'Brave', icon: 'B', desc: 'Independent' },
]

const api = () => (window as any).browserAPI

export default function SettingsPanel({ sidebarWidth }: SettingsPanelProps) {
  const { settingsPanelVisible, hideSettingsPanel, settings, saveSetting, darkMode, toggleTheme, showToast } = useBrowser()

  const [qlName, setQlName] = useState('')
  const [qlUrl, setQlUrl] = useState('')
  const nameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cssTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNameChange = (value: string) => {
    if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current)
    nameTimeoutRef.current = setTimeout(() => saveSetting('userName', value), 500)
  }

  const handleCSSChange = (value: string) => {
    if (cssTimeoutRef.current) clearTimeout(cssTimeoutRef.current)
    cssTimeoutRef.current = setTimeout(() => saveSetting('customCSS', value), 800)
  }

  const handleAccentColor = (color: string) => {
    saveSetting('accentColor', color)
    document.documentElement.style.setProperty('--accent', color)
  }

  const addQuickLink = () => {
    if (!qlName.trim() || !qlUrl.trim()) return
    let url = qlUrl.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    const links: QuickLink[] = [...(settings.quickLinks || []), {
      name: qlName.trim(), url, color: '#667eea', icon: qlName.trim()[0].toUpperCase(),
    }]
    saveSetting('quickLinks', links)
    setQlName(''); setQlUrl('')
  }

  const removeQuickLink = (index: number) => {
    const links = [...(settings.quickLinks || [])]
    links.splice(index, 1)
    saveSetting('quickLinks', links)
  }

  const handleImport = async (source: string) => {
    const b = api()
    if (!b) return
    let result: any
    switch (source) {
      case 'Chrome': result = await b.importChrome(); break
      case 'Firefox': result = await b.importFirefox(); break
      case 'Safari': result = await b.importSafari(); break
      case 'Edge': result = await b.importEdge(); break
      default: return
    }
    if (result.success) showToast('\u2705', `Imported ${result.count} from ${source}`)
    else showToast('\u274C', result.error || 'Import failed')
  }

  return (
    <>
      <div
        className={'settings-overlay' + (settingsPanelVisible ? ' visible' : '')}
        style={{ left: sidebarWidth + 'px', width: `calc(100% - ${sidebarWidth}px)`, pointerEvents: settingsPanelVisible ? 'auto' : 'none' }}
        onClick={hideSettingsPanel}
      />
      <div className="settings-panel" style={{ transform: settingsPanelVisible ? 'translateX(0)' : 'translateX(100%)' }}>
        <div className="settings-header">
          <div>
            <h2>Settings</h2>
            <p className="settings-header-sub">Customize your Nova experience</p>
          </div>
          <button className="settings-close" onClick={hideSettingsPanel}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="settings-body">

          {/* ═══ PROFILE ═══ */}
          <div className="s-card">
            <div className="s-card-header">
              <span className="s-card-icon">&#x1F464;</span>
              <span className="s-card-title">Profile</span>
            </div>
            <div className="s-row">
              <div className="s-row-info">
                <span className="s-row-label">Your Name</span>
                <span className="s-row-desc">Shown on new tab greeting</span>
              </div>
              <input
                className="s-input"
                defaultValue={settings.userName || ''}
                placeholder="Enter your name"
                onChange={e => handleNameChange(e.target.value)}
              />
            </div>
            <div className="s-divider" />
            <div className="s-row">
              <div className="s-row-info">
                <span className="s-row-label">Search Engine</span>
                <span className="s-row-desc">Default for address bar</span>
              </div>
              <select
                className="s-select"
                value={settings.searchEngine || 'google'}
                onChange={e => saveSetting('searchEngine', e.target.value)}
              >
                {SEARCH_ENGINES.map(se => (
                  <option key={se.value} value={se.value}>{se.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══ APPEARANCE ═══ */}
          <div className="s-card">
            <div className="s-card-header">
              <span className="s-card-icon">&#x1F3A8;</span>
              <span className="s-card-title">Appearance</span>
            </div>
            <div className="s-row">
              <div className="s-row-info">
                <span className="s-row-label">Dark Mode</span>
                <span className="s-row-desc">{darkMode ? 'Dark theme active' : 'Light theme active'}</span>
              </div>
              <button className={'s-toggle' + (darkMode ? ' on' : '')} onClick={toggleTheme}>
                <span className="s-toggle-knob">{darkMode ? '\u{1F319}' : '\u2600\uFE0F'}</span>
              </button>
            </div>
            <div className="s-divider" />
            <div style={{ padding: '0' }}>
              <div className="s-row-label" style={{ marginBottom: '12px' }}>Accent Color</div>
              <div className="s-color-grid">
                {ACCENT_COLORS.map(({ color, name }) => (
                  <div
                    key={color}
                    className={'s-color-swatch' + (settings.accentColor === color ? ' active' : '')}
                    title={name}
                    onClick={() => handleAccentColor(color)}
                  >
                    <div className="s-color-fill" style={{ background: color }} />
                    {settings.accentColor === color && (
                      <svg className="s-color-check" width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ QUICK LINKS ═══ */}
          <div className="s-card">
            <div className="s-card-header">
              <span className="s-card-icon">&#x26A1;</span>
              <span className="s-card-title">Quick Links</span>
              <span className="s-card-badge">{(settings.quickLinks || []).length}</span>
            </div>
            {(settings.quickLinks || []).length > 0 && (
              <div className="s-ql-list">
                {(settings.quickLinks || []).map((link, i) => (
                  <div key={i} className="s-ql-item">
                    <img
                      className="s-ql-favicon"
                      src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=32`}
                      onError={(e: any) => { e.target.style.display = 'none' }}
                      alt=""
                    />
                    <div className="s-ql-info">
                      <span className="s-ql-name">{link.name}</span>
                      <span className="s-ql-url">{new URL(link.url).hostname}</span>
                    </div>
                    <button className="s-ql-remove" onClick={() => removeQuickLink(i)}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="s-ql-add">
              <input className="s-ql-input" placeholder="Name" value={qlName} onChange={e => setQlName(e.target.value)} />
              <input className="s-ql-input" placeholder="URL" value={qlUrl} onChange={e => setQlUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQuickLink()} />
              <button className="s-ql-add-btn" onClick={addQuickLink}>
                <svg width="14" height="14" viewBox="0 0 14 14"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* ═══ PRIVACY ═══ */}
          <div className="s-card">
            <div className="s-card-header">
              <span className="s-card-icon">&#x1F6E1;</span>
              <span className="s-card-title">Privacy & Security</span>
            </div>
            <div className="s-row">
              <div className="s-row-info">
                <span className="s-row-label">Ad & Tracker Blocker</span>
                <span className="s-row-desc">Block ads, trackers, and malware</span>
              </div>
              <button
                className={'s-toggle' + (settings.adBlockEnabled ? ' on' : '')}
                onClick={() => saveSetting('adBlockEnabled', !settings.adBlockEnabled)}
              >
                <span className="s-toggle-knob" />
              </button>
            </div>
          </div>

          {/* ═══ ADVANCED ═══ */}
          <div className="s-card">
            <div className="s-card-header">
              <span className="s-card-icon">&#x2699;</span>
              <span className="s-card-title">Advanced</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div className="s-row-label" style={{ marginBottom: '8px' }}>Custom CSS</div>
              <span className="s-row-desc" style={{ display: 'block', marginBottom: '8px' }}>Inject CSS into every webpage</span>
              <textarea
                className="s-css-editor"
                placeholder={'/* Example */\nbody {\n  font-family: \'Inter\' !important;\n}'}
                defaultValue={settings.customCSS || ''}
                onChange={e => handleCSSChange(e.target.value)}
              />
            </div>
          </div>

          {/* ═══ IMPORT ═══ */}
          <div className="s-card">
            <div className="s-card-header">
              <span className="s-card-icon">&#x1F4E5;</span>
              <span className="s-card-title">Import Bookmarks</span>
            </div>
            <div className="s-import-grid">
              {[
                { name: 'Chrome', icon: 'G', bg: '#4285F4' },
                { name: 'Firefox', icon: 'F', bg: '#FF7139' },
                { name: 'Safari', icon: 'S', bg: '#006CFF' },
                { name: 'Edge', icon: 'E', bg: '#0078D7' },
              ].map(browser => (
                <button key={browser.name} className="s-import-btn" onClick={() => handleImport(browser.name)}>
                  <span className="s-import-icon" style={{ background: browser.bg }}>{browser.icon}</span>
                  <span>{browser.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ═══ ABOUT ═══ */}
          <div className="s-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#x2728;</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Nova Browser</div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '4px' }}>Version 1.0.0 &middot; Built with love</div>
          </div>

        </div>
      </div>
    </>
  )
}

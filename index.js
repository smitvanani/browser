require('dotenv').config()
const { app, BrowserWindow, BrowserView, ipcMain, session, clipboard, nativeImage, Menu, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const DEFAULT_URL = `file://${path.join(__dirname, 'newtab.html')}`
const ONBOARDING_URL = `file://${path.join(__dirname, 'onboarding.html')}`

let win = null
let sidebarWidth = 260
let focusMode = false
let splitMode = false
let splitView = null
let aiPanelWidth = 0

// ═══ SPACES ═══
const SPACE_COLORS = [
  { name: 'Grape', gradient: ['#f5f0f8', '#faf8f5'], accent: '#764ba2' },
  { name: 'Indigo', gradient: ['#eef1fc', '#faf8f5'], accent: '#667eea' },
  { name: 'Mint', gradient: ['#edf8f1', '#faf8f5'], accent: '#6bcf7f' },
  { name: 'Coral', gradient: ['#fdf0ee', '#faf8f5'], accent: '#f5576c' },
  { name: 'Peach', gradient: ['#fdf3ee', '#faf8f5'], accent: '#fda085' },
  { name: 'Sky', gradient: ['#eef4fd', '#faf8f5'], accent: '#66a6ff' }
]

let spaces = [{ id: 1, name: 'Personal', colorIndex: 0, tabs: [], activeTabId: null, nextTabId: 1 }]
let activeSpaceId = 1
let nextSpaceId = 2

// ═══ SESSION RESTORE ═══
const sessionPath = path.join(app.getPath('userData'), 'session.json')
function saveSession() {
  try {
    const data = spaces.map(s => ({
      id: s.id, name: s.name, colorIndex: s.colorIndex,
      activeTabId: s.activeTabId, nextTabId: s.nextTabId,
      tabs: s.tabs.filter(t => !t.url.startsWith('file://')).map(t => ({
        id: t.id, url: t.url, title: t.title, pinned: t.pinned
      }))
    }))
    const tmpPath = sessionPath + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify({ spaces: data, activeSpaceId, nextSpaceId }))
    fs.renameSync(tmpPath, sessionPath)
  } catch (e) { console.error('[Session] Save error:', e) }
}
function loadSession() {
  try { return JSON.parse(fs.readFileSync(sessionPath, 'utf8')) } catch { return null }
}
// Auto-save session every 30 seconds
let sessionInterval = null
function startSessionAutoSave() {
  if (sessionInterval) clearInterval(sessionInterval)
  sessionInterval = setInterval(saveSession, 30000)
}

// ═══ BOOKMARKS ═══
let bookmarks = []
const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json')
function loadBookmarks() {
  try { bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8')) } catch { bookmarks = [] }
}
function saveBookmarks() {
  try { fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2)) } catch (e) { console.error('Bookmark save error:', e) }
}

// ═══ HISTORY ═══
const historyPath = path.join(app.getPath('userData'), 'history.json')
let history = []
let historyNextId = 1
function loadHistory() {
  try {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'))
    // Recover next ID from existing entries
    const maxId = history.reduce((max, h) => Math.max(max, typeof h.id === 'number' ? h.id : 0), 0)
    historyNextId = maxId + 1
  } catch { history = [] }
}
let historySaveTimeout = null
function saveHistory() {
  if (historySaveTimeout) return // throttle: max one write per second
  historySaveTimeout = setTimeout(() => {
    historySaveTimeout = null
    try { fs.writeFileSync(historyPath, JSON.stringify(history)) } catch {}
  }, 1000)
}
function addToHistory(url, title) {
  if (!url || url.startsWith('file://') || url.startsWith('about:')) return
  history.unshift({ url, title: title || url, timestamp: Date.now(), id: historyNextId++ })
  if (history.length > 5000) history = history.slice(0, 5000)
  saveHistory()
}
loadHistory()

// ═══ CLOSED TABS STACK ═══
let closedTabs = [] // { url, title }

// ═══ SETTINGS ═══
const settingsPath = path.join(app.getPath('userData'), 'settings.json')
const defaultSettings = {
  onboardingComplete: false,
  userName: '',
  searchEngine: 'google',
  accentColor: '',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  newtab: {
    showClock: true, showWeather: true, showQuote: true,
    showTodos: true, showQuickLinks: true,
    backgroundType: 'gradient', customBackground: '',
  },
  quickLinks: [],
  customCSS: '',
  adBlockEnabled: true
}
let settings = { ...defaultSettings }
function loadSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    settings = { ...defaultSettings, ...data, newtab: { ...defaultSettings.newtab, ...(data.newtab || {}) } }
  } catch { settings = { ...defaultSettings } }
}
function saveSettings() {
  try { fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2)) } catch (e) { console.error('Settings save error:', e) }
}

// Inject settings into new tab pages
function injectSettingsIntoView(wc) {
  const s = JSON.stringify(settings)
  wc.executeJavaScript(`try { window.__browserSettings = ${s}; if (window.applySettings) window.applySettings(${s}); } catch(e) {}`)
    .catch(() => {})
}

// Inject custom CSS into BrowserViews
let injectedCSSKeys = new Map()
function applyCustomCSS(wc) {
  const key = wc.id
  // Remove old injection
  if (injectedCSSKeys.has(key)) {
    wc.removeInsertedCSS(injectedCSSKeys.get(key)).catch(() => {})
  }
  if (settings.customCSS && settings.customCSS.trim()) {
    wc.insertCSS(settings.customCSS).then(cssKey => {
      injectedCSSKeys.set(key, cssKey)
    }).catch(() => {})
  }
}


// ═══ DOWNLOADS ═══
let downloads = []

// ═══ HELPERS ═══
function getActiveSpace() { return spaces.find(s => s.id === activeSpaceId) }

function getContentBounds() {
  const [width, height] = win.getContentSize()
  const sw = focusMode ? 0 : sidebarWidth
  const aw = aiPanelWidth
  if (splitMode) {
    const contentW = width - sw - aw
    return { x: sw, y: 0, width: Math.floor(contentW / 2), height }
  }
  return { x: sw, y: 0, width: width - sw - aw, height }
}

function getSplitBounds() {
  const [width, height] = win.getContentSize()
  const sw = focusMode ? 0 : sidebarWidth
  const aw = aiPanelWidth
  const contentW = width - sw - aw
  const halfW = Math.floor(contentW / 2)
  return { x: sw + halfW, y: 0, width: contentW - halfW, height }
}

// ═══ BROWSERVIEW MANAGEMENT ═══
function createBrowserView(url, space) {
  if (!space) space = getActiveSpace()
  const loadUrl = url || DEFAULT_URL
  const isLocal = loadUrl.startsWith('file://')
  const isPDF = loadUrl.toLowerCase().endsWith('.pdf')
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, plugins: true,
      ...((isLocal && !isPDF) ? { preload: path.join(__dirname, 'preload.js') } : {})
    }
  })

  const id = space.nextTabId++

  // For PDF files, render using an embedded viewer
  let actualUrl = loadUrl
  if (isPDF) {
    let pdfSrc = loadUrl
    if (pdfSrc.startsWith('/')) pdfSrc = 'file://' + pdfSrc
    const pdfName = path.basename(pdfSrc)
    actualUrl = `data:text/html,${encodeURIComponent(`<!DOCTYPE html><html><head><title>${pdfName}</title><style>*{margin:0;padding:0}html,body{width:100%;height:100%;overflow:hidden}</style></head><body><embed src="${pdfSrc}" type="application/pdf" width="100%" height="100%" style="border:none"></body></html>`)}`
  }

  const tab = { id, view, title: 'New Tab', url: loadUrl, pinned: false, loading: false, audible: false, favicon: '' }

  const wc = view.webContents
  // Forward keyboard shortcuts from BrowserView to main window renderer
  wc.on('before-input-event', (e, input) => {
    if (!win || win.isDestroyed()) return
    if (!(input.meta || input.control) || input.type !== 'keyDown') return
    const key = input.key.toLowerCase()
    const shift = input.shift

    const shortcuts = {
      'l': 'url', 'f': !shift ? 'find' : null,
      ',': 'settings', 'j': 'ai', 'y': 'history', 'd': 'bookmark-this',
    }
    if (shortcuts[key]) {
      e.preventDefault()
      win.webContents.send('shortcut', shortcuts[key])
      return
    }

    // Cmd+1-9: switch to tab by position (9 = last tab)
    if (key >= '1' && key <= '9') {
      e.preventDefault()
      const space = getActiveSpace()
      const idx = key === '9' ? space.tabs.length - 1 : parseInt(key) - 1
      if (idx < space.tabs.length) switchToTab(space.tabs[idx].id, space)
      return
    }

    // Cmd+Shift+] / Cmd+Shift+[: cycle tabs
    if (shift && (input.key === ']' || input.key === '[')) {
      e.preventDefault()
      const space = getActiveSpace()
      const currentIdx = space.tabs.findIndex(t => t.id === space.activeTabId)
      if (currentIdx === -1) return
      const next = input.key === ']'
        ? (currentIdx + 1) % space.tabs.length
        : (currentIdx - 1 + space.tabs.length) % space.tabs.length
      switchToTab(space.tabs[next].id, space)
      return
    }
  })

  wc.on('did-start-loading', () => { tab.loading = true; sendLoadingState(tab) })
  wc.on('did-stop-loading', () => { tab.loading = false; sendLoadingState(tab) })
  wc.on('did-navigate', (e, navUrl) => {
    tab.url = navUrl; sendTabUpdate()
    addToHistory(navUrl, tab.title)
    blockedCounts[wc.id] = 0
  })
  wc.on('did-navigate-in-page', (e, navUrl) => { tab.url = navUrl; sendTabUpdate() })
  wc.on('page-title-updated', (e, title) => { tab.title = title; sendTabUpdate() })
  wc.on('page-favicon-updated', (e, favicons) => {
    if (favicons && favicons.length > 0) { tab.favicon = favicons[0]; sendTabUpdate() }
  })
  wc.on('did-fail-load', (e, code, desc, failedUrl) => {
    console.error(`[Tab ${id}] Load failed: ${failedUrl} (${code}: ${desc})`)
    // Don't show error for aborted loads (user navigated away) or subframe errors
    if (code === -3 || code === 0) return
    const errorHtml = `<!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; } body { height:100vh; display:flex; align-items:center; justify-content:center;
      font-family:'Inter',system-ui,sans-serif; background:var(--content-bg,#faf8f5); color:#1a1a2e; }
      .err { text-align:center; max-width:400px; padding:40px; }
      .err-icon { font-size:48px; margin-bottom:16px; }
      .err-title { font-size:18px; font-weight:700; margin-bottom:8px; }
      .err-desc { font-size:13px; color:#8b8b9e; margin-bottom:20px; line-height:1.5; }
      .err-url { font-size:11px; color:#b0b0c0; word-break:break-all; margin-bottom:20px; }
      .err-btn { padding:10px 24px; border:none; border-radius:10px; background:#667eea; color:#fff;
        font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
      .err-btn:hover { filter:brightness(1.1); }
    </style></head><body><div class="err">
      <div class="err-icon">\u26A0\uFE0F</div>
      <div class="err-title">Can\u2019t reach this page</div>
      <div class="err-desc">${desc || 'The page failed to load.'}</div>
      <div class="err-url">${(failedUrl || '').replace(/</g, '&lt;')}</div>
      <button class="err-btn" onclick="location.reload()">Try Again</button>
    </div></body></html>`
    wc.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`).catch(() => {})
  })

  // Right-click context menu (Chrome-like)
  wc.on('context-menu', (e, params) => {
    const menuItems = []

    // Navigation
    if (wc.canGoBack()) menuItems.push({ label: 'Back', click: () => wc.goBack(), accelerator: 'CmdOrCtrl+[' })
    if (wc.canGoForward()) menuItems.push({ label: 'Forward', click: () => wc.goForward(), accelerator: 'CmdOrCtrl+]' })
    menuItems.push({ label: 'Reload', click: () => wc.reload(), accelerator: 'CmdOrCtrl+R' })
    menuItems.push({ type: 'separator' })

    // Text selection actions
    if (params.selectionText) {
      menuItems.push({ label: 'Copy', click: () => wc.copy(), accelerator: 'CmdOrCtrl+C' })
      menuItems.push({ label: `Search "${params.selectionText.substring(0, 30)}${params.selectionText.length > 30 ? '...' : ''}"`, click: () => {
        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(params.selectionText)
        createBrowserView(searchUrl, getActiveSpace())
      }})
      menuItems.push({ type: 'separator' })

    }

    // Editable field actions
    if (params.isEditable) {
      menuItems.push({ label: 'Cut', click: () => wc.cut(), accelerator: 'CmdOrCtrl+X' })
      menuItems.push({ label: 'Copy', click: () => wc.copy(), accelerator: 'CmdOrCtrl+C' })
      menuItems.push({ label: 'Paste', click: () => wc.paste(), accelerator: 'CmdOrCtrl+V' })
      menuItems.push({ label: 'Select All', click: () => wc.selectAll(), accelerator: 'CmdOrCtrl+A' })
      menuItems.push({ type: 'separator' })
    }

    // Link actions
    if (params.linkURL) {
      menuItems.push({ label: 'Open Link in New Tab', click: () => createBrowserView(params.linkURL, getActiveSpace()) })
      menuItems.push({ label: 'Copy Link Address', click: () => clipboard.writeText(params.linkURL) })
      menuItems.push({ type: 'separator' })
    }

    // Image actions
    if (params.hasImageContents) {
      menuItems.push({ label: 'Open Image in New Tab', click: () => createBrowserView(params.srcURL, getActiveSpace()) })
      menuItems.push({ label: 'Copy Image Address', click: () => clipboard.writeText(params.srcURL) })
      menuItems.push({ label: 'Save Image As...', click: () => wc.downloadURL(params.srcURL) })
      menuItems.push({ type: 'separator' })
    }

    // Page actions
    menuItems.push({ label: 'Save Page As...', click: () => { wc.savePage(path.join(app.getPath('downloads'), (tab.title || 'page') + '.html'), 'HTMLComplete').catch(() => {}) }, accelerator: 'CmdOrCtrl+S' })
    menuItems.push({ label: 'Print...', click: () => wc.print(), accelerator: 'CmdOrCtrl+P' })
    menuItems.push({ type: 'separator' })

    // View source & inspect
    menuItems.push({ label: 'View Page Source', click: () => createBrowserView('view-source:' + tab.url, getActiveSpace()) })
    menuItems.push({ label: 'Inspect Element', click: () => { wc.inspectElement(params.x, params.y) }, accelerator: 'CmdOrCtrl+Shift+C' })

    const menu = Menu.buildFromTemplate(menuItems)
    menu.popup({ window: win })
  })

  // Open links in new tab (middle-click, target=_blank, window.open)
  wc.setWindowOpenHandler(({ url }) => {
    if (url && url !== 'about:blank') createBrowserView(url, getActiveSpace())
    return { action: 'deny' }
  })

  // Nova AI: intercept requests from injected script (registered once, outside did-finish-load)
  wc.on('console-message', async (e, level, msg) => {
    // Selection AI (Explain, Translate, Summarize, Ask)
    if (msg.startsWith('__NOVA_AI__')) {
      try {
        const data = JSON.parse(msg.substring('__NOVA_AI__'.length))
        const resp = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          messages: [{ role: 'user', content: data.prompt }]
        })
        const text = resp.content[0].text
        wc.executeJavaScript(`window.postMessage({type:'nova-ai-response',text:${JSON.stringify(text)}},'*')`).catch(() => {})
      } catch (err) {
        wc.executeJavaScript(`window.postMessage({type:'nova-ai-error',text:${JSON.stringify('AI error: ' + err.message)}},'*')`).catch(() => {})
      }
    }
    // Writing Assistant (Fix Grammar, Make Shorter, etc.)
    if (msg.startsWith('__NOVA_WRITE__')) {
      try {
        const data = JSON.parse(msg.substring('__NOVA_WRITE__'.length))
        const resp = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          messages: [{ role: 'user', content: data.prompt }]
        })
        const text = resp.content[0].text
        wc.executeJavaScript(`window.postMessage({type:'nova-ai-write-response',text:${JSON.stringify(text)}},'*')`).catch(() => {})
      } catch (err) {
        wc.executeJavaScript(`window.postMessage({type:'nova-ai-error',text:${JSON.stringify('Write error: ' + err.message)}},'*')`).catch(() => {})
      }
    }
  })

  wc.on('did-finish-load', () => {
    console.log(`[Tab ${id}] Loaded: ${tab.url}`)
    // Mouse back/forward buttons
    wc.executeJavaScript(`
      if (!window.__novaMouseNav) {
        window.__novaMouseNav = true;
        window.addEventListener('mouseup', e => {
          if (e.button === 3) { e.preventDefault(); history.back(); }
          if (e.button === 4) { e.preventDefault(); history.forward(); }
        });
      }
    `).catch(() => {})

    // Inject Nova AI inline selection assistant
    if (!tab.url.startsWith('file://')) {
      try {
        const aiScript = fs.readFileSync(path.join(__dirname, 'ai-inject.js'), 'utf8')
        wc.executeJavaScript(aiScript).catch(() => {})
      } catch {}
    }
    // Inject custom CSS into web pages
    if (!tab.url.startsWith('file://')) applyCustomCSS(wc)
    // Inject settings into new tab pages and focus search bar
    if (tab.url.startsWith('file://')) {
      injectSettingsIntoView(wc)
      wc.focus()
      // Ensure the search input gets focus
      setTimeout(() => {
        if (!wc.isDestroyed()) {
          wc.executeJavaScript(`
            const s = document.getElementById('search');
            if (s) { s.focus(); s.click(); }
          `).catch(() => {})
        }
      }, 200)
    }
  })

  // Audio state (store interval on tab for cleanup)
  tab.audioInterval = setInterval(() => {
    if (wc.isDestroyed()) { clearInterval(tab.audioInterval); return }
    const nowAudible = wc.isCurrentlyAudible()
    if (nowAudible !== tab.audible) {
      tab.audible = nowAudible
      sendTabUpdate()
      if (tab.id === space.activeTabId) {
        win.webContents.send('audio-state-changed', { tabId: tab.id, audible: nowAudible })
      }
    }
  }, 1000)

  space.tabs.push(tab)
  win.addBrowserView(view)
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  wc.loadURL(actualUrl)
  switchToTab(id, space)
  return tab
}

function switchToTab(id, space) {
  if (!space) space = getActiveSpace()
  tabLastActive.set(id, Date.now())
  trackScreenTime()
  for (const tab of space.tabs) tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  space.activeTabId = id
  const activeTab = space.tabs.find(t => t.id === id)
  if (activeTab) {
    activeTab.view.setBounds(getContentBounds())
    try { win.setTopBrowserView(activeTab.view) } catch {}
    activeTab.view.webContents.focus()
    if (activeTab.title) win.setTitle(activeTab.title)
  }
  sendTabUpdate()
  sendActiveTabChanged()
}

function closeTabById(id) {
  const space = getActiveSpace()
  if (space.tabs.length === 1) {
    const tab = space.tabs[0]
    tab.view.webContents.loadURL(DEFAULT_URL)
    tab.title = 'New Tab'; tab.url = DEFAULT_URL; tab.pinned = false
    sendTabUpdate()
    return tab.id
  }
  const index = space.tabs.findIndex(t => t.id === id)
  if (index === -1) return space.activeTabId
  const tab = space.tabs[index]
  // Save to closed tabs stack for reopen
  if (tab.url && !tab.url.startsWith('file://')) {
    closedTabs.push({ url: tab.url, title: tab.title })
    if (closedTabs.length > 20) closedTabs.shift()
  }
  if (tab.audioInterval) clearInterval(tab.audioInterval)
  win.removeBrowserView(tab.view)
  tab.view.webContents.close()
  space.tabs.splice(index, 1)
  if (id === space.activeTabId) {
    switchToTab(space.tabs[Math.min(index, space.tabs.length - 1)].id, space)
  } else sendTabUpdate()
  return space.activeTabId
}

// ═══ SPACES ═══
function hideAllViews() {
  for (const s of spaces) for (const t of s.tabs) t.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  if (splitView) { splitView.setBounds({ x: 0, y: 0, width: 0, height: 0 }) }
}

function switchSpace(spaceId) {
  hideAllViews()
  if (splitMode) { closeSplit() }
  activeSpaceId = spaceId
  const space = getActiveSpace()
  if (space.tabs.length === 0) createBrowserView(DEFAULT_URL, space)
  else switchToTab(space.activeTabId, space)
  sendSpacesUpdate(); sendTabUpdate()
}

// ═══ SEND TO RENDERER ═══
let tabUpdateTimer = null
function sendTabUpdate() {
  if (!win || win.isDestroyed()) return
  // Debounce: batch rapid updates (favicon, title, loading) into one send
  if (tabUpdateTimer) return
  tabUpdateTimer = setTimeout(() => {
    tabUpdateTimer = null
    if (!win || win.isDestroyed()) return
    const space = getActiveSpace()
    win.webContents.send('tab-updated', {
      tabs: space.tabs.map(t => ({ id: t.id, title: t.title, url: t.url, pinned: t.pinned, loading: t.loading, audible: t.audible, favicon: t.favicon })),
      activeTabId: space.activeTabId
    })
  }, 50)
}

function sendActiveTabChanged() {
  if (!win || win.isDestroyed()) return
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  win.webContents.send('active-tab-changed', { id: space.activeTabId, url: t ? t.url : '', title: t ? t.title : '' })
}

function sendLoadingState(tab) {
  if (!win || win.isDestroyed()) return
  const space = getActiveSpace()
  if (tab.id === space.activeTabId) win.webContents.send('loading-state-changed', { loading: tab.loading })
}

function sendSpacesUpdate() {
  if (!win || win.isDestroyed()) return
  win.webContents.send('spaces-updated', {
    spaces: spaces.map(s => ({ id: s.id, name: s.name, colorIndex: s.colorIndex, accent: s.customAccent || SPACE_COLORS[s.colorIndex].accent, gradient: SPACE_COLORS[s.colorIndex].gradient, tabCount: s.tabs.length })),
    activeSpaceId
  })
}

// ═══ SPLIT VIEW ═══
function toggleSplit() {
  if (splitMode) { closeSplit(); return }
  splitMode = true
  splitView = new BrowserView({ webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') } })
  win.addBrowserView(splitView)
  splitView.webContents.loadURL(DEFAULT_URL)
  splitView.setBounds(getSplitBounds())
  // Resize main tab
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  if (t) t.view.setBounds(getContentBounds())
  win.webContents.send('split-changed', { active: true })
}

function closeSplit() {
  splitMode = false
  if (splitView) {
    win.removeBrowserView(splitView)
    splitView.webContents.close()
    splitView = null
  }
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  if (t) t.view.setBounds(getContentBounds())
  win.webContents.send('split-changed', { active: false })
}

// ═══ FOCUS MODE ═══
function toggleFocus() {
  focusMode = !focusMode
  updateAllBounds()
  win.webContents.send('focus-changed', { active: focusMode })
}

function updateAllBounds() {
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  if (t) t.view.setBounds(getContentBounds())
  if (splitMode && splitView) splitView.setBounds(getSplitBounds())
}

// ═══ FIND IN PAGE ═══
let findRequestId = 0
let lastFindText = ''
function getActiveWC() {
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  return t ? t.view.webContents : null
}

// ═══ WINDOW ═══
function createWindow() {
  loadBookmarks()
  loadSettings()

  win = new BrowserWindow({
    width: 1400, height: 900,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: false,
    title: 'Nova',
    backgroundColor: '#f0ede8',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, webviewTag: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile(path.join(__dirname, 'dist', 'renderer', 'index.html'))

  win.webContents.on('did-finish-load', () => {
    console.log('[Main] UI loaded')
    const isOnboarding = !settings.onboardingComplete
    if (isOnboarding) {
      sidebarWidth = 0
      win.webContents.send('sidebar-visibility', { hidden: true })
      sendSpacesUpdate()
      createBrowserView(ONBOARDING_URL, getActiveSpace())
      return
    }

    // Try to restore previous session
    const savedSession = loadSession()
    if (savedSession && savedSession.spaces && savedSession.spaces.length > 0) {
      // Check if there are any real tabs to restore
      const totalTabs = savedSession.spaces.reduce((sum, s) => sum + (s.tabs ? s.tabs.length : 0), 0)

      if (totalTabs > 0) {
        // Clear default space
        spaces = []
        let restoredTabs = 0

        for (const savedSpace of savedSession.spaces) {
          const spaceId = savedSpace.id || (nextSpaceId++)
          const space = {
            id: spaceId,
            name: savedSpace.name || 'Space',
            colorIndex: savedSpace.colorIndex || 0,
            tabs: [],
            activeTabId: null,
            nextTabId: savedSpace.nextTabId || 1
          }
          spaces.push(space)

          let restoredActiveTab = null
          for (const t of (savedSpace.tabs || [])) {
            if (t.url && !t.url.startsWith('file://')) {
              const tab = createBrowserView(t.url, space)
              if (t.pinned) tab.pinned = true
              if (t.title) tab.title = t.title
              if (t.id === savedSpace.activeTabId) restoredActiveTab = tab.id
              restoredTabs++
            }
          }

          // Restore active tab using the new ID from the mapping
          if (restoredActiveTab && space.tabs.find(t => t.id === restoredActiveTab)) {
            space.activeTabId = restoredActiveTab
          } else if (space.tabs.length > 0) {
            space.activeTabId = space.tabs[space.tabs.length - 1].id
          }

          // If space ended up empty, give it a new tab
          if (space.tabs.length === 0) {
            createBrowserView(DEFAULT_URL, space)
          }
        }

        // Restore nextSpaceId (use saved value or compute from max ID to avoid collisions)
        const maxSpaceId = Math.max(...spaces.map(s => s.id))
        nextSpaceId = savedSession.nextSpaceId ? Math.max(savedSession.nextSpaceId, maxSpaceId + 1) : maxSpaceId + 1
        const restoreSpaceId = savedSession.activeSpaceId || spaces[0].id
        activeSpaceId = spaces.find(s => s.id === restoreSpaceId) ? restoreSpaceId : spaces[0].id
        switchSpace(activeSpaceId)

        console.log(`[Session] Restored ${restoredTabs} tabs across ${spaces.length} spaces`)
      } else {
        createBrowserView(DEFAULT_URL, getActiveSpace())
      }
    } else {
      createBrowserView(DEFAULT_URL, getActiveSpace())
    }
    startSessionAutoSave()
    sendSpacesUpdate()
  })

  win.on('resize', updateAllBounds)

  // Download tracking
  session.defaultSession.on('will-download', (event, item) => {
    const dl = {
      id: String(Date.now()),
      filename: item.getFilename(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      path: item.getSavePath() || '',
      url: item.getURL(),
      startTime: Date.now()
    }
    downloads.push(dl)
    win.webContents.send('download-update', { downloads: downloads.slice(-50) })

    item.on('updated', (e, state) => {
      dl.receivedBytes = item.getReceivedBytes()
      dl.totalBytes = item.getTotalBytes()
      dl.state = state
      dl.path = item.getSavePath()
      win.webContents.send('download-update', { downloads: downloads.slice(-50) })
    })
    item.once('done', (e, state) => {
      dl.state = state
      dl.receivedBytes = dl.totalBytes
      dl.path = item.getSavePath()
      win.webContents.send('download-update', { downloads: downloads.slice(-50) })
      if (state === 'completed' && win && !win.isDestroyed()) {
        win.webContents.send('download-complete', { filename: dl.filename, path: dl.path })
      }
    })
  })
}

// ═══ PAGE TYPE DETECTION ═══
function detectPageType(url, title, text) {
  const lowerText = text.toLowerCase()
  const lowerUrl = url.toLowerCase()
  const lowerTitle = (title || '').toLowerCase()

  // Product page
  if (lowerText.includes('add to cart') || lowerText.includes('buy now') || lowerText.includes('add to bag') ||
      lowerUrl.includes('/product') || lowerUrl.includes('/item') || lowerText.includes('price')) {
    return 'product'
  }
  // Article/blog
  if (lowerUrl.includes('/blog') || lowerUrl.includes('/article') || lowerUrl.includes('/post') ||
      lowerUrl.includes('/news') || lowerText.includes('min read') || lowerText.includes('published')) {
    return 'article'
  }
  // Video
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('vimeo.com') || lowerUrl.includes('twitch.tv') ||
      lowerUrl.includes('/watch') || lowerUrl.includes('/video')) {
    return 'video'
  }
  // Documentation
  if (lowerUrl.includes('/docs') || lowerUrl.includes('/documentation') || lowerUrl.includes('/api') ||
      lowerUrl.includes('/reference') || lowerUrl.includes('readme')) {
    return 'docs'
  }
  // Social media
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com') || lowerUrl.includes('reddit.com') ||
      lowerUrl.includes('instagram.com') || lowerUrl.includes('linkedin.com') || lowerUrl.includes('facebook.com')) {
    return 'social'
  }
  // Search results
  if (lowerUrl.includes('google.com/search') || lowerUrl.includes('bing.com/search') ||
      lowerUrl.includes('duckduckgo.com') || lowerUrl.includes('search.brave.com')) {
    return 'search'
  }
  // GitHub/code
  if (lowerUrl.includes('github.com') || lowerUrl.includes('gitlab.com') || lowerUrl.includes('stackoverflow.com')) {
    return 'code'
  }
  return 'webpage'
}

// ═══ IPC HANDLERS ═══
// Tabs
ipcMain.handle('tab-create', (e, url) => createBrowserView(url).id)

// ═══ PRIVATE/INCOGNITO WINDOW ═══
function openPrivateWindow() {
  const privateWin = new BrowserWindow({
    width: 1200, height: 800,
    titleBarStyle: 'hiddenInset',
    title: 'Nova — Private',
    backgroundColor: '#1a1a2e',
    webPreferences: { nodeIntegration: false, contextIsolation: true, partition: 'private-' + Date.now() }
  })
  privateWin.loadFile(path.join(__dirname, 'private.html'))
}
ipcMain.handle('open-private-window', () => { openPrivateWindow(); return true })

// Overlay: hide/show active BrowserView so React overlays (URL bar, find bar) are visible
ipcMain.handle('overlay-show', () => {
  const space = getActiveSpace()
  const tab = space.tabs.find(t => t.id === space.activeTabId)
  if (tab) tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
})
ipcMain.handle('overlay-hide', () => {
  const space = getActiveSpace()
  const tab = space.tabs.find(t => t.id === space.activeTabId)
  if (tab) {
    tab.view.setBounds(getContentBounds())
    try { win.setTopBrowserView(tab.view) } catch {}
  }
})

ipcMain.handle('tab-close', (e, id) => closeTabById(id))
ipcMain.handle('tab-switch', (e, id) => { switchToTab(id); return id })
ipcMain.handle('tab-navigate', (e, url) => { const wc = getActiveWC(); if (wc) wc.loadURL(url) })
ipcMain.handle('tab-go-back', () => { const wc = getActiveWC(); if (wc && wc.canGoBack()) wc.goBack() })
ipcMain.handle('tab-go-forward', () => { const wc = getActiveWC(); if (wc && wc.canGoForward()) wc.goForward() })
ipcMain.handle('tab-reload', () => { const wc = getActiveWC(); if (wc) wc.reload() })
ipcMain.handle('tab-pin', (e, id, pinned) => {
  const space = getActiveSpace(); const t = space.tabs.find(t => t.id === id)
  if (t) { t.pinned = pinned; sendTabUpdate() }
})
ipcMain.handle('tab-close-others', (e, keepId) => {
  const space = getActiveSpace()
  const toClose = space.tabs.filter(t => t.id !== keepId && !t.pinned)
  for (const t of toClose) {
    if (t.url && !t.url.startsWith('file://')) {
      closedTabs.push({ url: t.url, title: t.title })
      if (closedTabs.length > 20) closedTabs.shift()
    }
    if (t.audioInterval) clearInterval(t.audioInterval)
    win.removeBrowserView(t.view)
    t.view.webContents.close()
  }
  space.tabs = space.tabs.filter(t => t.id === keepId || t.pinned)
  if (space.activeTabId !== keepId) switchToTab(keepId, space)
  else sendTabUpdate()
  return true
})
ipcMain.handle('tab-reorder', (e, fromId, toId) => {
  const space = getActiveSpace()
  const fromIdx = space.tabs.findIndex(t => t.id === fromId)
  const toIdx = space.tabs.findIndex(t => t.id === toId)
  if (fromIdx === -1 || toIdx === -1) return
  const [tab] = space.tabs.splice(fromIdx, 1)
  space.tabs.splice(toIdx, 0, tab)
  sendTabUpdate()
})
ipcMain.handle('tab-get-active-info', () => {
  const space = getActiveSpace(); const t = space.tabs.find(t => t.id === space.activeTabId)
  return t ? { id: t.id, url: t.url, title: t.title } : null
})

// Spaces
ipcMain.handle('spaces-get', () => ({
  spaces: spaces.map(s => ({ id: s.id, name: s.name, colorIndex: s.colorIndex, accent: s.customAccent || SPACE_COLORS[s.colorIndex].accent, gradient: SPACE_COLORS[s.colorIndex].gradient, tabCount: s.tabs.length })),
  activeSpaceId, colors: SPACE_COLORS
}))
ipcMain.handle('space-create', (e, name) => {
  const id = nextSpaceId++
  spaces.push({ id, name, colorIndex: spaces.length % SPACE_COLORS.length, tabs: [], activeTabId: null, nextTabId: 1 })
  switchSpace(id)
  return id
})
ipcMain.handle('space-switch', (e, id) => { switchSpace(id); return id })
ipcMain.handle('space-delete', (e, id) => {
  if (spaces.length <= 1) return false
  const s = spaces.find(s => s.id === id); if (!s) return false
  for (const t of s.tabs) { if (t.audioInterval) clearInterval(t.audioInterval); win.removeBrowserView(t.view); t.view.webContents.close() }
  spaces = spaces.filter(s => s.id !== id)
  if (activeSpaceId === id) switchSpace(spaces[0].id)
  else sendSpacesUpdate()
  return true
})

// Find in page
ipcMain.handle('find-in-page', (e, text) => {
  const wc = getActiveWC(); if (!wc || !text) return
  lastFindText = text
  findRequestId = wc.findInPage(text)
  wc.removeAllListeners('found-in-page')
  wc.on('found-in-page', (event, result) => {
    if (result.requestId >= findRequestId) {
      win.webContents.send('find-result', { matches: result.matches, activeMatch: result.activeMatchOrdinal })
    }
  })
})
ipcMain.handle('find-next', () => { const wc = getActiveWC(); if (wc && lastFindText) wc.findInPage(lastFindText, { findNext: true, forward: true }) })
ipcMain.handle('find-previous', () => { const wc = getActiveWC(); if (wc && lastFindText) wc.findInPage(lastFindText, { findNext: true, forward: false }) })
ipcMain.handle('find-stop', () => { const wc = getActiveWC(); if (wc) { wc.stopFindInPage('clearSelection'); lastFindText = '' } })

// Screenshot
ipcMain.handle('screenshot', async () => {
  const wc = getActiveWC(); if (!wc) return null
  const img = await wc.capturePage()
  const pngBuf = img.toPNG()
  const dlPath = path.join(app.getPath('downloads'), `screenshot-${Date.now()}.png`)
  fs.writeFileSync(dlPath, pngBuf)
  clipboard.writeImage(nativeImage.createFromBuffer(pngBuf))
  console.log(`[Screenshot] Saved to ${dlPath} and copied to clipboard`)
  return dlPath
})

// Zoom
ipcMain.handle('zoom-in', () => {
  const wc = getActiveWC(); if (!wc) return
  const z = wc.getZoomLevel(); wc.setZoomLevel(z + 0.5)
  win.webContents.send('zoom-changed', { level: wc.getZoomLevel() })
})
ipcMain.handle('zoom-out', () => {
  const wc = getActiveWC(); if (!wc) return
  const z = wc.getZoomLevel(); wc.setZoomLevel(z - 0.5)
  win.webContents.send('zoom-changed', { level: wc.getZoomLevel() })
})
ipcMain.handle('zoom-reset', () => {
  const wc = getActiveWC(); if (!wc) return
  wc.setZoomLevel(0)
  win.webContents.send('zoom-changed', { level: 0 })
})
ipcMain.handle('zoom-get', () => { const wc = getActiveWC(); return wc ? wc.getZoomLevel() : 0 })

// Split view
ipcMain.handle('split-toggle', () => toggleSplit())
ipcMain.handle('split-navigate', (e, url) => { if (splitView) splitView.webContents.loadURL(url) })

// Focus mode
ipcMain.handle('focus-toggle', () => toggleFocus())

// Sidebar resize
ipcMain.handle('sidebar-set-width', (e, w) => { sidebarWidth = w; updateAllBounds() })

// Bookmarks
ipcMain.handle('bookmarks-get', () => bookmarks)
ipcMain.handle('bookmark-add', (e, url, title) => {
  if (!bookmarks.find(b => b.url === url)) { bookmarks.push({ url, title, addedAt: Date.now() }); saveBookmarks() }
  return bookmarks
})
ipcMain.handle('bookmark-remove', (e, url) => {
  bookmarks = bookmarks.filter(b => b.url !== url); saveBookmarks()
  return bookmarks
})
ipcMain.handle('bookmark-check', (e, url) => !!bookmarks.find(b => b.url === url))

// ═══ HISTORY ═══
ipcMain.handle('history-get', (e, query) => {
  if (query) {
    const q = query.toLowerCase()
    return history.filter(h => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q)).slice(0, 200)
  }
  return history.slice(0, 200)
})
ipcMain.handle('history-clear', () => { history = []; saveHistory(); return true })
ipcMain.handle('history-suggest', (e, query) => {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  const seen = new Set()
  return history.filter(h => {
    const match = h.url.toLowerCase().includes(q) || h.title.toLowerCase().includes(q)
    if (match && !seen.has(h.url)) { seen.add(h.url); return true }
    return false
  }).slice(0, 8).map(h => ({ url: h.url, title: h.title }))
})
ipcMain.handle('history-delete', (e, id) => { history = history.filter(h => h.id !== id); saveHistory(); return true })

// ═══ REOPEN CLOSED TABS ═══
ipcMain.handle('tab-reopen', () => {
  if (closedTabs.length === 0) return null
  const last = closedTabs.pop()
  createBrowserView(last.url, getActiveSpace())
  if (win && !win.isDestroyed()) {
    win.webContents.send('tab-reopened', { title: last.title || 'Tab' })
  }
  return last
})

// ═══ DOWNLOADS ═══
ipcMain.handle('downloads-get', () => downloads.slice(-50))
ipcMain.handle('download-open', (e, filePath) => {
  const { shell } = require('electron')
  shell.openPath(filePath)
})
ipcMain.handle('download-show', (e, filePath) => {
  const { shell } = require('electron')
  shell.showItemInFolder(filePath)
})

// ═══ DEVTOOLS ═══
ipcMain.handle('devtools-toggle', () => {
  const wc = getActiveWC()
  if (wc) { wc.isDevToolsOpened() ? wc.closeDevTools() : wc.openDevTools({ mode: 'right' }) }
})

// ═══ PRINT ═══
ipcMain.handle('page-print', () => {
  const wc = getActiveWC()
  if (wc) wc.print()
})

// ═══ STOP LOADING ═══
ipcMain.handle('tab-stop', () => {
  const wc = getActiveWC()
  if (wc) wc.stop()
})

// ═══ MUTE TAB ═══
ipcMain.handle('tab-mute', (e, id) => {
  const space = getActiveSpace()
  const tab = space.tabs.find(t => t.id === id)
  if (tab) {
    const muted = !tab.view.webContents.isAudioMuted()
    tab.view.webContents.setAudioMuted(muted)
    return muted
  }
  return false
})

// Onboarding
ipcMain.handle('onboarding-complete', (e, choices) => {
  settings.onboardingComplete = true
  settings.userName = choices.userName || ''
  settings.accentColor = choices.accentColor || ''
  settings.searchEngine = choices.searchEngine || 'google'
  saveSettings()
  const space = getActiveSpace()
  // Apply chosen accent color to the default space
  const chosenAccent = choices.accentColor || ''
  if (chosenAccent) {
    const matchIdx = SPACE_COLORS.findIndex(c => c.accent === chosenAccent)
    if (matchIdx !== -1) {
      space.colorIndex = matchIdx
    } else {
      space.customAccent = chosenAccent
    }
  }
  // Show top bar again
  sidebarWidth = 260
  win.webContents.send('sidebar-visibility', { hidden: false })
  updateAllBounds()
  // Navigate the active tab to newtab
  const t = space.tabs.find(t => t.id === space.activeTabId)
  if (t) t.view.webContents.loadURL(DEFAULT_URL)
  sendSpacesUpdate()
  return true
})

// Settings
ipcMain.handle('settings-get', () => settings)
ipcMain.handle('settings-save', (e, newSettings) => {
  settings = { ...defaultSettings, ...newSettings, newtab: { ...defaultSettings.newtab, ...(newSettings.newtab || {}) } }
  saveSettings()
  // Re-inject CSS into all active views
  for (const s of spaces) {
    for (const t of s.tabs) {
      if (!t.view.webContents.isDestroyed()) {
        if (!t.url.startsWith('file://')) applyCustomCSS(t.view.webContents)
        else injectSettingsIntoView(t.view.webContents)
      }
    }
  }
  return settings
})
ipcMain.handle('inject-css', (e, css) => {
  settings.customCSS = css
  saveSettings()
  for (const s of spaces) {
    for (const t of s.tabs) {
      if (!t.view.webContents.isDestroyed() && !t.url.startsWith('file://')) {
        applyCustomCSS(t.view.webContents)
      }
    }
  }
})

// Import from other browsers
ipcMain.handle('import-chrome-bookmarks', async () => {
  const chromePaths = [
    path.join(app.getPath('home'), 'Library/Application Support/Google/Chrome/Default/Bookmarks'),
    path.join(app.getPath('home'), 'Library/Application Support/Google/Chrome/Profile 1/Bookmarks'),
    path.join(app.getPath('home'), 'snap/chromium/common/chromium/Default/Bookmarks'),
    path.join(app.getPath('home'), '.config/google-chrome/Default/Bookmarks'),
    path.join(app.getPath('home'), 'AppData/Local/Google/Chrome/User Data/Default/Bookmarks')
  ]
  for (const p of chromePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'))
      const imported = []
      function extract(node) {
        if (node.type === 'url') imported.push({ url: node.url, title: node.name, addedAt: Date.now() })
        if (node.children) node.children.forEach(extract)
      }
      if (data.roots) {
        Object.values(data.roots).forEach(root => { if (root && typeof root === 'object') extract(root) })
      }
      const newBms = imported.filter(b => !bookmarks.find(e => e.url === b.url))
      bookmarks = bookmarks.concat(newBms)
      saveBookmarks()
      console.log(`[Import] Imported ${newBms.length} bookmarks from Chrome`)
      return { success: true, count: newBms.length, source: 'Chrome' }
    } catch { continue }
  }
  return { success: false, error: 'Chrome bookmarks not found' }
})

ipcMain.handle('import-firefox-bookmarks', async () => {
  const ffBase = process.platform === 'darwin'
    ? path.join(app.getPath('home'), 'Library/Application Support/Firefox/Profiles')
    : process.platform === 'win32'
    ? path.join(app.getPath('home'), 'AppData/Roaming/Mozilla/Firefox/Profiles')
    : path.join(app.getPath('home'), '.mozilla/firefox')
  try {
    const profiles = fs.readdirSync(ffBase).filter(f => f.endsWith('.default-release') || f.endsWith('.default'))
    for (const profile of profiles) {
      const jsonPath = path.join(ffBase, profile, 'bookmarkbackups')
      if (!fs.existsSync(jsonPath)) continue
      const files = fs.readdirSync(jsonPath).filter(f => f.endsWith('.jsonlz4') || f.endsWith('.json')).sort().reverse()
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const data = JSON.parse(fs.readFileSync(path.join(jsonPath, file), 'utf8'))
        const imported = []
        function extract(node) {
          if (node.uri) imported.push({ url: node.uri, title: node.title || '', addedAt: Date.now() })
          if (node.children) node.children.forEach(extract)
        }
        extract(data)
        const newBms = imported.filter(b => !bookmarks.find(e => e.url === b.url) && b.url.startsWith('http'))
        bookmarks = bookmarks.concat(newBms)
        saveBookmarks()
        return { success: true, count: newBms.length, source: 'Firefox' }
      }
    }
  } catch { /* ignore */ }
  return { success: false, error: 'Firefox bookmarks not found' }
})

ipcMain.handle('import-safari-bookmarks', async () => {
  if (process.platform !== 'darwin') return { success: false, error: 'Safari is macOS only' }
  const plistPath = path.join(app.getPath('home'), 'Library/Safari/Bookmarks.plist')
  try {
    // Safari uses binary plist, try to read via plutil
    const { execSync } = require('child_process')
    const json = execSync(`plutil -convert json -o - "${plistPath}"`, { encoding: 'utf8' })
    const data = JSON.parse(json)
    const imported = []
    function extract(node) {
      if (node.URLString) imported.push({ url: node.URLString, title: node.URIDictionary?.title || node.Title || '', addedAt: Date.now() })
      if (node.Children) node.Children.forEach(extract)
    }
    extract(data)
    const newBms = imported.filter(b => !bookmarks.find(e => e.url === b.url) && b.url.startsWith('http'))
    bookmarks = bookmarks.concat(newBms)
    saveBookmarks()
    return { success: true, count: newBms.length, source: 'Safari' }
  } catch {
    return { success: false, error: 'Could not read Safari bookmarks' }
  }
})

ipcMain.handle('import-edge-bookmarks', async () => {
  const edgePaths = [
    path.join(app.getPath('home'), 'Library/Application Support/Microsoft Edge/Default/Bookmarks'),
    path.join(app.getPath('home'), '.config/microsoft-edge/Default/Bookmarks'),
    path.join(app.getPath('home'), 'AppData/Local/Microsoft/Edge/User Data/Default/Bookmarks')
  ]
  for (const p of edgePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'))
      const imported = []
      function extract(node) {
        if (node.type === 'url') imported.push({ url: node.url, title: node.name, addedAt: Date.now() })
        if (node.children) node.children.forEach(extract)
      }
      if (data.roots) Object.values(data.roots).forEach(root => { if (root && typeof root === 'object') extract(root) })
      const newBms = imported.filter(b => !bookmarks.find(e => e.url === b.url))
      bookmarks = bookmarks.concat(newBms)
      saveBookmarks()
      return { success: true, count: newBms.length, source: 'Edge' }
    } catch { continue }
  }
  return { success: false, error: 'Edge bookmarks not found' }
})

// ═══ POMODORO TIMER ═══
let pomodoroState = { running: false, timeLeft: 25 * 60, mode: 'work', workDuration: 25, breakDuration: 5 }
let pomodoroInterval = null

function pomodoroTick() {
  if (!pomodoroState.running) return
  pomodoroState.timeLeft--
  if (pomodoroState.timeLeft <= 0) {
    pomodoroState.mode = pomodoroState.mode === 'work' ? 'break' : 'work'
    pomodoroState.timeLeft = (pomodoroState.mode === 'work' ? pomodoroState.workDuration : pomodoroState.breakDuration) * 60
    if (win) win.webContents.send('pomodoro-done', { mode: pomodoroState.mode })
  }
  if (win) win.webContents.send('pomodoro-tick', { ...pomodoroState })
}

ipcMain.handle('pomodoro-start', () => {
  pomodoroState.running = true
  if (pomodoroInterval) clearInterval(pomodoroInterval)
  pomodoroInterval = setInterval(pomodoroTick, 1000)
  return pomodoroState
})
ipcMain.handle('pomodoro-pause', () => {
  pomodoroState.running = false
  if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null }
  return pomodoroState
})
ipcMain.handle('pomodoro-reset', () => {
  pomodoroState = { running: false, timeLeft: 25 * 60, mode: 'work', workDuration: 25, breakDuration: 5 }
  if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null }
  return pomodoroState
})
ipcMain.handle('pomodoro-get', () => pomodoroState)

// ═══ PICTURE IN PICTURE ═══
ipcMain.handle('pip-toggle', async () => {
  const wc = getActiveWC()
  if (!wc) return false
  try {
    await wc.executeJavaScript(`
      (async () => {
        const video = document.querySelector('video');
        if (video) {
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
          else await video.requestPictureInPicture();
          return true;
        }
        return false;
      })()
    `)
    return true
  } catch { return false }
})

// ═══ READING MODE ═══
let readingModeActive = new Set()
const readingCSS = `
  body { max-width: 680px !important; margin: 40px auto !important; padding: 20px !important;
    font-family: 'Georgia', serif !important; font-size: 19px !important; line-height: 1.8 !important;
    color: #2c2c2c !important; background: #faf8f5 !important; }
  img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 16px 0 !important; }
  h1,h2,h3 { font-family: 'Inter', sans-serif !important; margin: 24px 0 12px !important; line-height: 1.3 !important; }
  nav, header, footer, aside, .sidebar, .ad, .ads, [class*="sidebar"], [class*="nav"],
  [class*="footer"], [class*="header"], [class*="menu"], [class*="social"], [class*="share"],
  [class*="comment"], [class*="related"], [class*="recommend"], iframe, .popup, .modal,
  [class*="cookie"], [class*="banner"], [class*="promo"], [id*="sidebar"], [id*="footer"],
  [id*="header"], [id*="nav"] { display: none !important; }
  a { color: #667eea !important; }
  pre, code { font-size: 14px !important; background: #f0ede8 !important; padding: 12px !important; border-radius: 8px !important; overflow-x: auto !important; }
`

ipcMain.handle('reading-mode-toggle', async () => {
  const wc = getActiveWC()
  if (!wc) return false
  const id = wc.id
  if (readingModeActive.has(id)) {
    wc.reload()
    readingModeActive.delete(id)
    return false
  } else {
    await wc.insertCSS(readingCSS)
    readingModeActive.add(id)
    return true
  }
})
ipcMain.handle('reading-mode-check', () => {
  const wc = getActiveWC()
  return wc ? readingModeActive.has(wc.id) : false
})

// ═══ SCREEN TIME ═══
let screenTime = {}
const screenTimePath = path.join(app.getPath('userData'), 'screentime.json')
let activeTabStartTime = Date.now()
let lastActiveDomain = ''

function loadScreenTime() {
  try {
    const data = JSON.parse(fs.readFileSync(screenTimePath, 'utf8'))
    const today = new Date().toISOString().slice(0, 10)
    screenTime = data[today] || {}
  } catch { screenTime = {} }
}
let screenTimeSaveTimer = null
function saveScreenTime() {
  // Debounce + async write to avoid blocking main thread
  if (screenTimeSaveTimer) return
  screenTimeSaveTimer = setTimeout(() => {
    screenTimeSaveTimer = null
    try {
      const today = new Date().toISOString().slice(0, 10)
      let allData = {}
      try { allData = JSON.parse(fs.readFileSync(screenTimePath, 'utf8')) } catch {}
      allData[today] = screenTime
      // Keep only last 7 days
      const keys = Object.keys(allData).sort().reverse().slice(0, 7)
      const trimmed = {}; keys.forEach(k => trimmed[k] = allData[k])
      const tmpPath = screenTimePath + '.tmp'
      fs.writeFileSync(tmpPath, JSON.stringify(trimmed, null, 2))
      fs.renameSync(tmpPath, screenTimePath)
    } catch (e) { console.error('Screen time save error:', e) }
  }, 2000)
}

function trackScreenTime() {
  if (lastActiveDomain && lastActiveDomain !== 'newtab') {
    const elapsed = Math.floor((Date.now() - activeTabStartTime) / 1000)
    screenTime[lastActiveDomain] = (screenTime[lastActiveDomain] || 0) + elapsed
    saveScreenTime()
  }
  activeTabStartTime = Date.now()
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  if (t && t.url && !t.url.startsWith('file://')) {
    try { lastActiveDomain = new URL(t.url).hostname } catch { lastActiveDomain = '' }
  } else { lastActiveDomain = 'newtab' }
}
// Track every 30 seconds
setInterval(trackScreenTime, 30000)

ipcMain.handle('screen-time-get', () => {
  trackScreenTime() // flush current
  return screenTime
})

// ═══ QUICK NOTES PER SITE ═══
let siteNotes = {}
const siteNotesPath = path.join(app.getPath('userData'), 'sitenotes.json')
function loadSiteNotes() {
  try { siteNotes = JSON.parse(fs.readFileSync(siteNotesPath, 'utf8')) } catch { siteNotes = {} }
}
function saveSiteNotes() {
  try { fs.writeFileSync(siteNotesPath, JSON.stringify(siteNotes, null, 2)) } catch (e) { console.error('Site notes save error:', e) }
}

ipcMain.handle('site-notes-get', (e, domain) => siteNotes[domain] || '')
ipcMain.handle('site-notes-save', (e, domain, note) => {
  if (note && note.trim()) siteNotes[domain] = note.trim()
  else delete siteNotes[domain]
  saveSiteNotes()
  return true
})
ipcMain.handle('site-notes-all', () => siteNotes)

// ═══ TAB SUSPENDER ═══
const TAB_SUSPEND_AFTER = 10 * 60 * 1000 // 10 minutes
let tabLastActive = new Map()

function checkSuspendTabs() {
  const now = Date.now()
  for (const s of spaces) {
    for (const t of s.tabs) {
      if (t.id === s.activeTabId) { tabLastActive.set(t.id, now); continue }
      if (t.suspended || t.url.startsWith('file://') || t.pinned) continue
      const lastActive = tabLastActive.get(t.id) || now
      if (now - lastActive > TAB_SUSPEND_AFTER) {
        t.suspended = true
        t.suspendedUrl = t.url
        t.view.webContents.loadURL(`data:text/html,<html><body style="background:#faf8f5;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#8b8b9e"><div style="text-align:center"><div style="font-size:48px;margin-bottom:16px">😴</div><div style="font-size:18px;font-weight:600;color:#1a1a2e;margin-bottom:8px">Tab Suspended</div><div style="font-size:13px">${t.title}</div><div style="font-size:12px;margin-top:4px;color:#b0b0c0">${t.url}</div></div></body></html>`)
        sendTabUpdate()
      }
    }
  }
}
setInterval(checkSuspendTabs, 60000)

ipcMain.handle('tab-wake', (e, id) => {
  for (const s of spaces) {
    const t = s.tabs.find(t => t.id === id)
    if (t && t.suspended) {
      t.suspended = false
      t.view.webContents.loadURL(t.suspendedUrl)
      tabLastActive.set(t.id, Date.now())
      sendTabUpdate()
      return true
    }
  }
  return false
})

// Ad blocker
ipcMain.handle('adblock-get-count', () => {
  const wc = getActiveWC()
  return {
    count: wc ? (blockedCounts[wc.id] || 0) : 0,
    total: totalBlocked
  }
})

ipcMain.handle('adblock-toggle', (e, enabled) => {
  settings.adBlockEnabled = enabled !== false
  saveSettings()
  return settings.adBlockEnabled
})

// ═══ AI (Claude API with Tool Use) ═══
const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
let aiChatHistory = []

// ═══ AI MEMORY ═══
const aiMemoryPath = path.join(app.getPath('userData'), 'ai-memory.json')
let aiMemory = {}
function loadAIMemory() { try { aiMemory = JSON.parse(fs.readFileSync(aiMemoryPath, 'utf8')) } catch { aiMemory = {} } }
function saveAIMemory() { try { fs.writeFileSync(aiMemoryPath, JSON.stringify(aiMemory, null, 2)) } catch(e) { console.error('[AI] Memory save error:', e) } }
loadAIMemory()

const AI_SYSTEM_MSG = `You are Nova AI, a powerful assistant built into the Nova web browser. You can control the browser, access files, remember things, and read webpages.

Be concise, friendly, and use a casual tone. When the user wants you to DO something (open a page, save a file, etc.), use the available tools. If they're just chatting, respond normally.

System info:
- Home directory: ${app.getPath('home')}
- Downloads: ${app.getPath('downloads')}
- Desktop: ${path.join(app.getPath('home'), 'Desktop')}
- Documents: ${path.join(app.getPath('home'), 'Documents')}

IMPORTANT: Always use the exact paths above. Never guess usernames. Use ~ or the full path from the system info.


Your stored memories: ${JSON.stringify(aiMemory)}
`

// Tool definitions for Claude API
const AI_TOOLS = [
  { name: 'open_url', description: 'Navigate the current tab to a URL', input_schema: { type: 'object', properties: { url: { type: 'string', description: 'The URL to open (e.g., https://youtube.com)' } }, required: ['url'] } },
  { name: 'new_tab', description: 'Open a URL in a new tab', input_schema: { type: 'object', properties: { url: { type: 'string', description: 'The URL to open. Leave empty for blank new tab' } }, required: [] } },
  { name: 'search', description: 'Search the web for a query', input_schema: { type: 'object', properties: { query: { type: 'string', description: 'The search query' } }, required: ['query'] } },
  { name: 'close_tab', description: 'Close the current tab', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'go_back', description: 'Go back in browser history', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'go_forward', description: 'Go forward in browser history', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'reload', description: 'Reload the current page', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'bookmark', description: 'Bookmark the current page', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'screenshot', description: 'Take a screenshot of the current page', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'save_pdf', description: 'Save the current page as a PDF file', input_schema: { type: 'object', properties: { path: { type: 'string', description: 'Where to save the PDF (e.g., ~/Desktop/page.pdf). Defaults to Downloads.' } }, required: [] } },
  { name: 'save_file', description: 'Save text content to a file', input_schema: { type: 'object', properties: { filename: { type: 'string', description: 'File path (e.g., ~/Desktop/notes.txt)' }, content: { type: 'string', description: 'The text content to save' } }, required: ['filename', 'content'] } },
  { name: 'save_page', description: 'Save current page text content to a file', input_schema: { type: 'object', properties: { filename: { type: 'string', description: 'File path to save to' } }, required: [] } },
  { name: 'read_file', description: 'Read a local file from the filesystem', input_schema: { type: 'object', properties: { path: { type: 'string', description: 'File path to read (e.g., ~/Documents/notes.txt)' } }, required: ['path'] } },
  { name: 'read_current_page', description: 'Read the text content of the currently active webpage', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'read_page', description: 'Fetch and read a webpage without opening it in a tab', input_schema: { type: 'object', properties: { url: { type: 'string', description: 'URL to fetch and read' } }, required: ['url'] } },
  { name: 'remember', description: 'Store something in persistent memory for later recall', input_schema: { type: 'object', properties: { key: { type: 'string', description: 'What to remember (e.g., "project_name", "api_key")' }, value: { type: 'string', description: 'The value to remember' } }, required: ['key', 'value'] } },
  { name: 'recall', description: 'Recall something from memory', input_schema: { type: 'object', properties: { key: { type: 'string', description: 'What to recall' } }, required: ['key'] } },
  { name: 'forget', description: 'Remove something from memory', input_schema: { type: 'object', properties: { key: { type: 'string', description: 'What to forget' } }, required: ['key'] } },
  // ═══ SYSTEM TOOLS ═══
  { name: 'list_directory', description: 'List all files and folders in a directory. Returns names, sizes, and types.', input_schema: { type: 'object', properties: { path: { type: 'string', description: 'Directory path (e.g., ~/Desktop, ~/Documents, /Users/smit/Projects)' } }, required: ['path'] } },
  { name: 'run_command', description: 'Run a shell/terminal command and return the output. Use for git, npm, system commands, etc.', input_schema: { type: 'object', properties: { command: { type: 'string', description: 'The shell command to execute (e.g., "ls -la", "git status", "npm install")' }, cwd: { type: 'string', description: 'Working directory for the command (optional, defaults to home)' } }, required: ['command'] } },
  { name: 'clipboard_read', description: 'Read the current contents of the system clipboard', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'clipboard_write', description: 'Write text to the system clipboard', input_schema: { type: 'object', properties: { text: { type: 'string', description: 'Text to copy to clipboard' } }, required: ['text'] } },
  { name: 'notification', description: 'Send a macOS system notification', input_schema: { type: 'object', properties: { title: { type: 'string', description: 'Notification title' }, body: { type: 'string', description: 'Notification message body' } }, required: ['title', 'body'] } },
  { name: 'system_info', description: 'Get system information like battery level, memory usage, OS version, disk space', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'move_file', description: 'Move or rename a file/folder from one location to another', input_schema: { type: 'object', properties: { from: { type: 'string', description: 'Source path' }, to: { type: 'string', description: 'Destination path' } }, required: ['from', 'to'] } },
  { name: 'delete_file', description: 'Delete a file or empty folder', input_schema: { type: 'object', properties: { path: { type: 'string', description: 'Path to delete' } }, required: ['path'] } },
  { name: 'search_files', description: 'Search for files by name pattern in a directory recursively', input_schema: { type: 'object', properties: { directory: { type: 'string', description: 'Directory to search in (e.g., ~/Documents)' }, pattern: { type: 'string', description: 'File name pattern to search for (e.g., "*.pdf", "report", "*.js")' } }, required: ['directory', 'pattern'] } },
]

function getActiveTabUrl() {
  const space = getActiveSpace()
  const t = space.tabs.find(t => t.id === space.activeTabId)
  return t ? t.url : ''
}

function resolveFilePath(url) {
  if (!url) return url
  if (url.startsWith('~/')) url = path.join(app.getPath('home'), url.substring(2))
  if (url.startsWith('/') && !url.startsWith('file://')) url = 'file://' + url
  if (!url.startsWith('http') && !url.startsWith('file://')) url = 'https://' + url
  return url
}

async function executeAITool(name, input) {
  console.log('[AI] Executing tool:', name, input)
  const searchEngine = settings.searchEngine || 'google'
  const engines = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q='
  }

  switch (name) {
    case 'open_url': {
      let url = resolveFilePath(input.url)
      const wc = getActiveWC()
      if (wc && url) wc.loadURL(url)
      return `Opened ${url}`
    }
    case 'new_tab': {
      let url = resolveFilePath(input.url)
      createBrowserView(url || null)
      return url ? `Opened ${url} in new tab` : 'Opened new tab'
    }
    case 'search': {
      const url = (engines[searchEngine] || engines.google) + encodeURIComponent(input.query)
      const wc = getActiveWC()
      if (wc) wc.loadURL(url)
      return `Searching for "${input.query}"`
    }
    case 'close_tab': {
      const space = getActiveSpace()
      if (space.activeTabId) closeTabById(space.activeTabId)
      return 'Closed tab'
    }
    case 'go_back': {
      const wc = getActiveWC()
      if (wc && wc.canGoBack()) wc.goBack()
      return 'Went back'
    }
    case 'go_forward': {
      const wc = getActiveWC()
      if (wc && wc.canGoForward()) wc.goForward()
      return 'Went forward'
    }
    case 'reload': {
      const wc = getActiveWC()
      if (wc) wc.reload()
      return 'Reloaded page'
    }
    case 'bookmark': {
      const space = getActiveSpace()
      const t = space.tabs.find(t => t.id === space.activeTabId)
      if (t && !t.url.startsWith('file://')) {
        if (!bookmarks.find(b => b.url === t.url)) {
          bookmarks.push({ url: t.url, title: t.title, addedAt: Date.now() })
          saveBookmarks()
        }
      }
      return 'Bookmarked!'
    }
    case 'screenshot': {
      const wc = getActiveWC()
      if (wc) {
        const img = await wc.capturePage()
        const dlPath = path.join(app.getPath('downloads'), `screenshot-${Date.now()}.png`)
        fs.writeFileSync(dlPath, img.toPNG())
        clipboard.writeImage(nativeImage.createFromBuffer(img.toPNG()))
      }
      return 'Screenshot saved!'
    }
    case 'save_file': {
      let filePath = input.filename
      if (!filePath) return 'No filename provided'
      const content = input.content || ''
      // Resolve path — support ~/Desktop, ~/Documents, absolute paths, or just filename
      if (filePath.startsWith('~/')) filePath = path.join(app.getPath('home'), filePath.substring(2))
      else if (!filePath.startsWith('/')) filePath = path.join(app.getPath('downloads'), filePath)
      // Ensure parent directory exists
      try { fs.mkdirSync(path.dirname(filePath), { recursive: true }) } catch {}
      try {
        fs.writeFileSync(filePath, content, 'utf8')
        return `Saved to ${filePath}`
      } catch(e) { return `Error saving: ${e.message}` }
    }
    case 'save_pdf': {
      const wc = getActiveWC()
      if (!wc) return 'No active tab'
      try {
        const title = await wc.executeJavaScript(`document.title`)
        let filePath = input.path || `${title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50).trim()}.pdf`
        if (!filePath.endsWith('.pdf')) filePath += '.pdf'
        if (filePath.startsWith('~/')) filePath = path.join(app.getPath('home'), filePath.substring(2))
        else if (!filePath.startsWith('/')) filePath = path.join(app.getPath('downloads'), filePath)
        try { fs.mkdirSync(path.dirname(filePath), { recursive: true }) } catch {}
        const pdfData = await wc.printToPDF({ printBackground: true })
        fs.writeFileSync(filePath, pdfData)
        return `PDF saved to ${filePath}`
      } catch(e) { return `Error saving PDF: ${e.message}` }
    }
    case 'save_page': {
      const wc = getActiveWC()
      if (!wc) return 'No active tab'
      try {
        const text = await wc.executeJavaScript(`document.body.innerText`)
        const title = await wc.executeJavaScript(`document.title`)
        let filePath = input.filename || `${title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50).trim()}.txt`
        if (filePath.startsWith('~/')) filePath = path.join(app.getPath('home'), filePath.substring(2))
        else if (!filePath.startsWith('/')) filePath = path.join(app.getPath('downloads'), filePath)
        try { fs.mkdirSync(path.dirname(filePath), { recursive: true }) } catch {}
        fs.writeFileSync(filePath, `${title}\n${'='.repeat(title.length)}\n\n${text}`, 'utf8')
        return `Page saved to ${filePath}`
      } catch(e) { return `Error: ${e.message}` }
    }
    case 'read_file': {
      try {
        let filePath = input.path
        if (filePath.startsWith('~/')) filePath = path.join(app.getPath('home'), filePath.substring(2))
        else if (!filePath.startsWith('/')) filePath = path.join(app.getPath('home'), filePath)
        const content = fs.readFileSync(filePath, 'utf8')
        return `File contents (${filePath}):\n${content.substring(0, 5000)}`
      } catch(e) { return `Error reading file: ${e.message}` }
    }
    case 'remember': {
      const key = input.key.trim().toLowerCase()
      const value = input.value.trim()
      aiMemory[key] = { value, savedAt: new Date().toISOString() }
      saveAIMemory()
      return `Remembered: ${key} = ${value}`
    }
    case 'recall': {
      const key = input.key.trim().toLowerCase()
      if (aiMemory[key]) {
        return `Memory "${key}": ${aiMemory[key].value} (saved ${new Date(aiMemory[key].savedAt).toLocaleDateString()})`
      }
      // Search all memories for partial match
      const matches = Object.entries(aiMemory).filter(([k]) => k.includes(key))
      if (matches.length > 0) {
        return 'Found memories:\n' + matches.map(([k, v]) => `- ${k}: ${v.value}`).join('\n')
      }
      return `No memory found for "${key}"`
    }
    case 'forget': {
      const key = input.key.trim().toLowerCase()
      if (aiMemory[key]) {
        delete aiMemory[key]
        saveAIMemory()
        return `Forgot "${key}"`
      }
      return `No memory found for "${key}"`
    }
    case 'read_page': {
      try {
        const { net } = require('electron')
        const pageContent = await new Promise((resolve, reject) => {
          const request = net.request(input.url)
          let body = ''
          request.on('response', (response) => {
            response.on('data', (chunk) => { body += chunk.toString() })
            response.on('end', () => resolve(body))
          })
          request.on('error', reject)
          request.end()
        })
        // Extract text from HTML
        const textContent = pageContent
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 6000)
        return `Page content from ${input.url}:\n${textContent}`
      } catch(e) { return `Error reading page: ${e.message}` }
    }
    case 'read_current_page': {
      const wc = getActiveWC()
      if (!wc) return 'No active tab'
      try {
        const text = await wc.executeJavaScript(`document.body.innerText.substring(0, 6000)`)
        return `Current page content:\n${text}`
      } catch(e) { return `Error: ${e.message}` }
    }
    // ═══ SYSTEM TOOLS ═══
    case 'list_directory': {
      try {
        let dirPath = input.path
        if (dirPath.startsWith('~/')) dirPath = path.join(app.getPath('home'), dirPath.substring(2))
        const items = fs.readdirSync(dirPath, { withFileTypes: true })
        const result = items.map(item => {
          const fullPath = path.join(dirPath, item.name)
          try {
            const stat = fs.statSync(fullPath)
            const size = stat.isFile() ? (stat.size > 1048576 ? (stat.size/1048576).toFixed(1)+'MB' : (stat.size/1024).toFixed(0)+'KB') : ''
            return `${item.isDirectory() ? '📁' : '📄'} ${item.name} ${size}`
          } catch { return `${item.isDirectory() ? '📁' : '📄'} ${item.name}` }
        })
        return `Contents of ${dirPath}:\n${result.join('\n')}`
      } catch(e) { return `Error: ${e.message}` }
    }
    case 'run_command': {
      try {
        const { execSync } = require('child_process')
        let cwd = input.cwd || app.getPath('home')
        if (cwd.startsWith('~/')) cwd = path.join(app.getPath('home'), cwd.substring(2))
        const output = execSync(input.command, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
        return output.substring(0, 5000) || '(no output)'
      } catch(e) {
        return `Command error: ${e.stderr || e.message}`.substring(0, 3000)
      }
    }
    case 'clipboard_read': {
      return clipboard.readText() || '(clipboard is empty)'
    }
    case 'clipboard_write': {
      clipboard.writeText(input.text)
      return `Copied to clipboard: "${input.text.substring(0, 100)}${input.text.length > 100 ? '...' : ''}"`
    }
    case 'notification': {
      const { Notification } = require('electron')
      if (Notification.isSupported()) {
        new Notification({ title: input.title, body: input.body, silent: false }).show()
        return `Notification sent: ${input.title}`
      }
      return 'Notifications not supported'
    }
    case 'system_info': {
      const os = require('os')
      const totalMem = (os.totalmem() / 1073741824).toFixed(1)
      const freeMem = (os.freemem() / 1073741824).toFixed(1)
      const usedMem = (totalMem - freeMem).toFixed(1)
      const cpus = os.cpus()
      const info = [
        `OS: ${os.type()} ${os.release()}`,
        `Machine: ${os.hostname()}`,
        `CPU: ${cpus[0]?.model || 'Unknown'} (${cpus.length} cores)`,
        `Memory: ${usedMem}GB used / ${totalMem}GB total (${freeMem}GB free)`,
        `Uptime: ${(os.uptime() / 3600).toFixed(1)} hours`,
        `Home: ${os.homedir()}`,
        `Platform: ${os.platform()} ${os.arch()}`
      ]
      // Try to get battery info on macOS
      try {
        const { execSync } = require('child_process')
        const battery = execSync('pmset -g batt', { encoding: 'utf8' })
        const match = battery.match(/(\d+)%/)
        if (match) info.push(`Battery: ${match[1]}%`)
      } catch {}
      return info.join('\n')
    }
    case 'move_file': {
      try {
        let fromPath = input.from, toPath = input.to
        if (fromPath.startsWith('~/')) fromPath = path.join(app.getPath('home'), fromPath.substring(2))
        if (toPath.startsWith('~/')) toPath = path.join(app.getPath('home'), toPath.substring(2))
        fs.renameSync(fromPath, toPath)
        return `Moved ${fromPath} → ${toPath}`
      } catch(e) { return `Error: ${e.message}` }
    }
    case 'delete_file': {
      try {
        let filePath = input.path
        if (filePath.startsWith('~/')) filePath = path.join(app.getPath('home'), filePath.substring(2))
        const stat = fs.statSync(filePath)
        if (stat.isDirectory()) fs.rmdirSync(filePath)
        else fs.unlinkSync(filePath)
        return `Deleted ${filePath}`
      } catch(e) { return `Error: ${e.message}` }
    }
    case 'search_files': {
      try {
        let dir = input.directory
        if (dir.startsWith('~/')) dir = path.join(app.getPath('home'), dir.substring(2))
        const { execSync } = require('child_process')
        const pattern = input.pattern.includes('*') ? `-name "${input.pattern}"` : `-name "*${input.pattern}*"`
        const results = execSync(`find "${dir}" -maxdepth 4 ${pattern} -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -30`, { encoding: 'utf8', timeout: 10000 })
        return results.trim() || 'No files found'
      } catch(e) { return `Error: ${e.message}` }
    }
    default:
      return 'Unknown tool: ' + name
  }
}

// Right panel visibility (settings, AI, notes, screen time)
ipcMain.handle('ai-panel-toggle', (e, visible) => {
  aiPanelWidth = visible ? 400 : 0
  updateAllBounds()
  return visible
})
ipcMain.handle('right-panel-toggle', (e, width) => {
  aiPanelWidth = width || 0
  updateAllBounds()
  return width
})

// AI Chat with browser control
ipcMain.handle('ai-chat', async (e, message) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { text: 'Nova AI requires an Anthropic API key. Add `ANTHROPIC_API_KEY` to your `.env` file and restart Nova.', actions: [] }
  }
  // Build messages array
  aiChatHistory.push({ role: 'user', content: message })

  // Get context
  const currentUrl = getActiveTabUrl()
  const pageContext = currentUrl && !currentUrl.startsWith('file://') ? `\nUser is currently on: ${currentUrl}` : ''
  const space = getActiveSpace()
  const openTabs = space.tabs.filter(t => !t.url.startsWith('file://')).map(t => `${t.title} (${t.url})`).join(', ')
  const tabsContext = openTabs ? `\nOpen tabs: ${openTabs}` : ''

  const systemMsg = AI_SYSTEM_MSG + pageContext + tabsContext

  // Build messages for API
  const messages = aiChatHistory.slice(-16).map(m => ({ role: m.role, content: m.content }))

  try {
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemMsg,
      tools: AI_TOOLS,
      messages: messages
    })

    const actionResults = []

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
      const toolResults = []

      for (const toolUse of toolUseBlocks) {
        const result = await executeAITool(toolUse.name, toolUse.input)
        actionResults.push(result)
        console.log('[AI] Tool result:', toolUse.name, result)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result
        })
      }

      // Continue the conversation with tool results
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemMsg,
        tools: AI_TOOLS,
        messages: messages
      })
    }

    // Extract final text response
    const textBlocks = response.content.filter(b => b.type === 'text')
    const displayText = textBlocks.map(b => b.text).join('\n') || (actionResults.length > 0 ? actionResults.join(', ') : 'Done!')

    aiChatHistory.push({ role: 'assistant', content: displayText })
    if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20)

    // Notify renderer of actions
    if (actionResults.length > 0 && win) {
      win.webContents.send('ai-actions-executed', { actions: [], results: actionResults })
    }

    return { text: displayText, actions: actionResults.filter(r => r.length < 100) }
  } catch (err) {
    console.error('[AI] Error:', err.message)
    return { text: `Oops, something went wrong: ${err.message}`, actions: [] }
  }
})

// Google search suggestions (safe server-side fetch, no JSONP)
ipcMain.handle('search-suggestions', async (e, query) => {
  if (!query || query.length < 2) return []
  try {
    const { net } = require('electron')
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
    const body = await new Promise((resolve, reject) => {
      const request = net.request(url)
      let data = ''
      request.on('response', (response) => {
        response.on('data', (chunk) => { data += chunk.toString() })
        response.on('end', () => resolve(data))
      })
      request.on('error', reject)
      setTimeout(() => reject(new Error('timeout')), 3000)
      request.end()
    })
    const parsed = JSON.parse(body)
    return (parsed[1] || []).slice(0, 5)
  } catch { return [] }
})

// Quick AI answer for URL bar
ipcMain.handle('ai-quick-answer', async (e, question) => {
  if (!question || question.trim().length < 5) return null
  try {
    const currentUrl = getActiveTabUrl()
    const pageContext = currentUrl && !currentUrl.startsWith('file://') ? `\nUser is currently on: ${currentUrl}` : ''
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: `You are Nova AI, a quick-answer assistant in a browser URL bar. Give a brief, direct answer in 1-3 sentences. No markdown, no bullet points — just a clean short answer.${pageContext}`,
      messages: [{ role: 'user', content: question }]
    })
    return resp.content[0].text
  } catch { return null }
})

ipcMain.handle('ai-clear-chat', () => { aiChatHistory = []; return true })
ipcMain.handle('ai-get-memories', () => aiMemory)
ipcMain.handle('ai-clear-memories', () => { aiMemory = {}; saveAIMemory(); return true })


// Summarize page
ipcMain.handle('ai-summarize', async () => {
  const wc = getActiveWC()
  if (!wc) return 'No active tab'
  try {
    const text = await wc.executeJavaScript(`document.body.innerText.substring(0, 8000)`)
    if (!text || text.trim().length < 50) return 'Not enough content to summarize.'
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: `Summarize this webpage content concisely in 3-5 bullet points. Use markdown.\n\nContent:\n${text}` }]
    })
    return resp.content[0].text
  } catch (err) { return `Error: ${err.message}` }
})

// Explain selected text
ipcMain.handle('ai-explain', async (e, selectedText) => {
  if (!selectedText || selectedText.trim().length < 2) return 'Please select some text first.'
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: `Explain this in simple terms. Be concise (2-3 sentences max):\n\n"${selectedText.substring(0, 3000)}"` }]
    })
    return resp.content[0].text
  } catch (err) { return `Error: ${err.message}` }
})

// Page Q&A
ipcMain.handle('ai-page-qa', async (e, question) => {
  const wc = getActiveWC()
  if (!wc) return 'No active tab'
  try {
    const text = await wc.executeJavaScript(`document.body.innerText.substring(0, 8000)`)
    if (!text || text.trim().length < 50) return 'Not enough page content to answer from.'
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: `Answer this question concisely based on the webpage:\n\nQuestion: ${question}\n\nContent:\n${text}` }]
    })
    return resp.content[0].text
  } catch (err) { return `Error: ${err.message}` }
})

// Get selected text from active tab
ipcMain.handle('ai-get-selection', async () => {
  const wc = getActiveWC()
  if (!wc) return ''
  try { return await wc.executeJavaScript(`window.getSelection().toString()`) } catch { return '' }
})

// AI Page Understanding - get insight on demand
ipcMain.handle('ai-page-insight', async (e, type) => {
  const wc = getActiveWC()
  if (!wc) return null
  try {
    const text = await wc.executeJavaScript(`document.body.innerText.substring(0, 5000)`)
    if (!text || text.trim().length < 100) return null

    let prompt = ''
    if (type.startsWith('custom:')) {
      prompt = type.substring(7) + `\n\nPage content:\n${text}`
    } else if (type === 'summary') {
      prompt = `Give me 2-3 bullet point summary of this page. Be very concise. Use markdown bullets.\n\nContent:\n${text}`
    } else if (type === 'keypoints') {
      prompt = `What are the 3 most important points on this page? One short sentence each. Use markdown bullets.\n\nContent:\n${text}`
    } else if (type === 'actions') {
      prompt = `What can a user DO on this page? List 2-3 possible actions in one short sentence each. Use markdown bullets.\n\nContent:\n${text}`
    }

    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })
    return resp.content[0].text
  } catch(e) { return null }
})

// Load persistent data
loadScreenTime()
loadSiteNotes()

// ═══ AD BLOCKER ═══
const AD_DOMAINS_LIST = [
  'doubleclick.net','googlesyndication.com','googleadservices.com','google-analytics.com',
  'googletagmanager.com','googletagservices.com','pagead2.googlesyndication.com',
  'adservice.google.com','ads.google.com',
  'facebook.com/tr','connect.facebook.net','pixel.facebook.com',
  'ads-twitter.com','static.ads-twitter.com','analytics.twitter.com',
  'ad.doubleclick.net','securepubads.g.doubleclick.net',
  'amazon-adsystem.com','aax.amazon-adsystem.com',
  'adskeeper.co.uk','adnxs.com','adsrvr.org','adtechus.com',
  'advertising.com','bluekai.com','casalemedia.com','chartbeat.com',
  'criteo.com','criteo.net','crwdcntrl.net','demdex.net',
  'exelator.com','eyeota.net','hotjar.com','indexww.com',
  'krxd.net','liadm.com','mathtag.com','moatads.com',
  'mookie1.com','myvisualiq.net','narrativ.com','newrelic.com',
  'omtrdc.net','openx.net','outbrain.com','pardot.com',
  'pubmatic.com','quantserve.com','revjet.com','rlcdn.com',
  'rubiconproject.com','scoota.co','scorecardresearch.com',
  'sharethis.com','simpli.fi','siteimproveanalytics.com',
  'smartadserver.com','taboola.com','tapad.com','teads.tv',
  'tribalfusion.com','turn.com','undertone.com',
  'yahoo.com/darla','yieldmo.com','zedo.com',
  'zemanta.com','zqtk.net','segment.com','segment.io',
  'mixpanel.com','amplitude.com','fullstory.com',
  'crazyegg.com','optimizely.com','onesignal.com',
  'popads.net','popcash.net','propellerads.com',
  'revcontent.com','mgid.com','content.ad',
  'track.adform.net','serving-sys.com','sizmek.com'
]
const AD_DOMAINS = new Set(AD_DOMAINS_LIST)

let blockedCounts = {} // tabId -> count
let totalBlocked = 0

function setupAdBlocker() {
  const { webRequest } = session.defaultSession

  webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!settings.adBlockEnabled) { callback({ cancel: false }); return }
    let urlHost = ''
    try { urlHost = new URL(details.url).hostname } catch { callback({ cancel: false }); return }
    // Check if any ad domain matches the URL hostname
    let shouldBlock = false
    for (const domain of AD_DOMAINS) {
      if (urlHost === domain || urlHost.endsWith('.' + domain)) { shouldBlock = true; break }
    }

    if (shouldBlock) {
      // Track blocked count
      if (details.webContentsId) {
        blockedCounts[details.webContentsId] = (blockedCounts[details.webContentsId] || 0) + 1
      }
      totalBlocked++

      // Notify renderer
      if (win) {
        const activeWC = getActiveWC()
        const count = activeWC ? (blockedCounts[activeWC.id] || 0) : 0
        win.webContents.send('ad-blocked', { count, total: totalBlocked })
      }

      callback({ cancel: true })
    } else {
      callback({ cancel: false })
    }
  })
}

app.setName('Nova')

// Prevent multiple instances — focus existing window instead
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

app.whenReady().then(() => {
  // Custom menu to capture Cmd+, and other shortcuts macOS intercepts
  const template = [
    // ═══ NOVA (App menu) ═══
    {
      label: 'Nova',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => { if (win) win.webContents.send('shortcut', 'settings') }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    // ═══ FILE ═══
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => createBrowserView(null, getActiveSpace())
        },
        {
          label: 'New Private Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => openPrivateWindow()
        },
        { type: 'separator' },
        {
          label: 'Duplicate Tab',
          click: () => {
            const space = getActiveSpace()
            const tab = space.tabs.find(t => t.id === space.activeTabId)
            if (tab && tab.url) createBrowserView(tab.url, space)
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => closeTabById(getActiveSpace().activeTabId)
        },
        {
          label: 'Reopen Closed Tab',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            if (closedTabs.length > 0) {
              const last = closedTabs.pop()
              createBrowserView(last.url, getActiveSpace())
              if (win && !win.isDestroyed()) {
                win.webContents.send('tab-reopened', { title: last.title || 'Tab' })
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(win, {
              filters: [
                { name: 'Web Files', extensions: ['html', 'htm', 'pdf', 'svg', 'xml', 'json', 'txt'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            })
            if (!result.canceled && result.filePaths.length > 0) {
              createBrowserView('file://' + result.filePaths[0], getActiveSpace())
            }
          }
        },
        {
          label: 'Save Page As...',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            const wc = getActiveWC()
            if (!wc) return
            const space = getActiveSpace()
            const tab = space.tabs.find(t => t.id === space.activeTabId)
            const defaultName = (tab?.title || 'page').replace(/[/\\?%*:|"<>]/g, '-')
            const result = await dialog.showSaveDialog(win, {
              defaultPath: path.join(app.getPath('downloads'), defaultName + '.html'),
              filters: [{ name: 'HTML', extensions: ['html'] }]
            })
            if (!result.canceled && result.filePath) {
              wc.savePage(result.filePath, 'HTMLComplete').catch(() => {})
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Print',
          accelerator: 'CmdOrCtrl+P',
          click: () => { const wc = getActiveWC(); if (wc) wc.print() }
        },
        {
          label: 'Screenshot',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => { if (win) win.webContents.send('shortcut', 'screenshot') }
        }
      ]
    },
    // ═══ EDIT ═══
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find in Page',
          accelerator: 'CmdOrCtrl+F',
          click: () => { if (win) win.webContents.send('shortcut', 'find') }
        }
      ]
    },
    // ═══ VIEW ═══
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => { const wc = getActiveWC(); if (wc) wc.reload() }
        },
        {
          label: 'Hard Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => { const wc = getActiveWC(); if (wc) wc.reloadIgnoringCache() }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => { const wc = getActiveWC(); if (wc) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); if (win) win.webContents.send('zoom-changed', { level: wc.getZoomLevel() }) } }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => { const wc = getActiveWC(); if (wc) { wc.setZoomLevel(wc.getZoomLevel() - 0.5); if (win) win.webContents.send('zoom-changed', { level: wc.getZoomLevel() }) } }
        },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => { const wc = getActiveWC(); if (wc) { wc.setZoomLevel(0); if (win) win.webContents.send('zoom-changed', { level: 0 }) } }
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => { if (win) win.setFullScreen(!win.isFullScreen()) }
        },
        {
          label: 'Focus Mode',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => toggleFocus()
        },
        {
          label: 'Split View',
          accelerator: 'CmdOrCtrl+\\',
          click: () => toggleSplit()
        },
        { type: 'separator' },
        {
          label: 'Reading Mode',
          click: () => { if (win) win.webContents.send('shortcut', 'reading-mode') }
        },
        {
          label: 'Picture in Picture',
          click: () => { if (win) win.webContents.send('shortcut', 'pip') }
        },
        { type: 'separator' },
        {
          label: 'View Page Source',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            const space = getActiveSpace()
            const tab = space.tabs.find(t => t.id === space.activeTabId)
            if (tab && tab.url && !tab.url.startsWith('file://')) {
              createBrowserView('view-source:' + tab.url, space)
            }
          }
        },
        {
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => { const wc = getActiveWC(); if (wc) { wc.isDevToolsOpened() ? wc.closeDevTools() : wc.openDevTools({ mode: 'right' }) } }
        },
        {
          label: 'Go to URL',
          accelerator: 'CmdOrCtrl+L',
          click: () => { if (win) win.webContents.send('shortcut', 'url') }
        }
      ]
    },
    // ═══ HISTORY ═══
    {
      label: 'History',
      submenu: [
        {
          label: 'Show All History',
          accelerator: 'CmdOrCtrl+Y',
          click: () => { if (win) win.webContents.send('shortcut', 'history') }
        },
        { type: 'separator' },
        {
          label: 'Back',
          accelerator: 'CmdOrCtrl+[',
          click: () => { const wc = getActiveWC(); if (wc && wc.canGoBack()) wc.goBack() }
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+]',
          click: () => { const wc = getActiveWC(); if (wc && wc.canGoForward()) wc.goForward() }
        },
        { type: 'separator' },
        {
          label: 'Clear History',
          click: () => { history = []; saveHistory(); if (win) win.webContents.send('shortcut', 'history-cleared') }
        }
      ]
    },
    // ═══ BOOKMARKS ═══
    {
      label: 'Bookmarks',
      submenu: [
        {
          label: 'Bookmark This Page',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            const wc = getActiveWC()
            if (!wc) return
            const space = getActiveSpace()
            const tab = space.tabs.find(t => t.id === space.activeTabId)
            if (tab && tab.url && !tab.url.startsWith('file://')) {
              const exists = bookmarks.find(b => b.url === tab.url)
              if (!exists) {
                bookmarks.push({ url: tab.url, title: tab.title || tab.url, timestamp: Date.now() })
                saveBookmarks()
                if (win) win.webContents.send('bookmark-added', { url: tab.url })
              }
            }
          }
        },
        {
          label: 'Show All Bookmarks',
          click: () => { if (win) win.webContents.send('shortcut', 'bookmarks') }
        },
        { type: 'separator' },
        {
          label: 'Import Chrome Bookmarks',
          click: () => { if (win) win.webContents.send('shortcut', 'import-bookmarks') }
        }
      ]
    },
    // ═══ DOWNLOADS ═══
    {
      label: 'Downloads',
      submenu: [
        {
          label: 'Show Downloads',
          click: () => { if (win) win.webContents.send('shortcut', 'downloads') }
        }
      ]
    },
    // ═══ TAB ═══
    {
      label: 'Tab',
      submenu: [
        {
          label: 'Next Tab',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => {
            const space = getActiveSpace()
            const idx = space.tabs.findIndex(t => t.id === space.activeTabId)
            if (idx !== -1) switchToTab(space.tabs[(idx + 1) % space.tabs.length].id, space)
          }
        },
        {
          label: 'Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => {
            const space = getActiveSpace()
            const idx = space.tabs.findIndex(t => t.id === space.activeTabId)
            if (idx !== -1) switchToTab(space.tabs[(idx - 1 + space.tabs.length) % space.tabs.length].id, space)
          }
        },
        { type: 'separator' },
        {
          label: 'Screen Time',
          click: () => { if (win) win.webContents.send('shortcut', 'screen-time') }
        },
        { type: 'separator' },
        {
          label: 'Nova AI',
          accelerator: 'CmdOrCtrl+J',
          click: () => { if (win) win.webContents.send('shortcut', 'ai') }
        },
        {
          label: 'AI Summarize Page',
          click: () => { if (win) win.webContents.send('shortcut', 'ai-summarize') }
        }
      ]
    },
    // ═══ WINDOW ═══
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    // ═══ HELP ═══
    {
      label: 'Help',
      submenu: [
        {
          label: 'Nova Help',
          click: () => createBrowserView('https://github.com/smitvanani/browser', getActiveSpace())
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  createWindow()
  // Setup ad blocker after window is created (settings are loaded)
  if (settings.adBlockEnabled !== false) setupAdBlocker()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('will-quit', () => {
  if (sessionInterval) clearInterval(sessionInterval)
  saveSession()
})

app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

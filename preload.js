const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('browserAPI', {
  // Tabs
  createTab: (url) => ipcRenderer.invoke('tab-create', url),
  closeTab: (id) => ipcRenderer.invoke('tab-close', id),
  switchTab: (id) => ipcRenderer.invoke('tab-switch', id),
  navigate: (url) => ipcRenderer.invoke('tab-navigate', url),
  goBack: () => ipcRenderer.invoke('tab-go-back'),
  goForward: () => ipcRenderer.invoke('tab-go-forward'),
  reload: () => ipcRenderer.invoke('tab-reload'),
  pinTab: (id, pinned) => ipcRenderer.invoke('tab-pin', id, pinned),
  getActiveTabInfo: () => ipcRenderer.invoke('tab-get-active-info'),
  closeOtherTabs: (keepId) => ipcRenderer.invoke('tab-close-others', keepId),

  // Spaces
  getSpaces: () => ipcRenderer.invoke('spaces-get'),
  createSpace: (name, color) => ipcRenderer.invoke('space-create', name, color),
  switchSpace: (id) => ipcRenderer.invoke('space-switch', id),
  deleteSpace: (id) => ipcRenderer.invoke('space-delete', id),

  // Find in page
  findInPage: (text) => ipcRenderer.invoke('find-in-page', text),
  findNext: () => ipcRenderer.invoke('find-next'),
  findPrevious: () => ipcRenderer.invoke('find-previous'),
  stopFind: () => ipcRenderer.invoke('find-stop'),

  // Screenshot
  screenshot: () => ipcRenderer.invoke('screenshot'),

  // Zoom
  zoomIn: () => ipcRenderer.invoke('zoom-in'),
  zoomOut: () => ipcRenderer.invoke('zoom-out'),
  zoomReset: () => ipcRenderer.invoke('zoom-reset'),
  getZoom: () => ipcRenderer.invoke('zoom-get'),

  // Split view
  toggleSplit: () => ipcRenderer.invoke('split-toggle'),
  splitNavigate: (url) => ipcRenderer.invoke('split-navigate', url),

  // Focus mode
  toggleFocus: () => ipcRenderer.invoke('focus-toggle'),

  // Sidebar resize
  setSidebarWidth: (width) => ipcRenderer.invoke('sidebar-set-width', width),

  // Bookmarks
  getBookmarks: () => ipcRenderer.invoke('bookmarks-get'),
  addBookmark: (url, title) => ipcRenderer.invoke('bookmark-add', url, title),
  removeBookmark: (url) => ipcRenderer.invoke('bookmark-remove', url),
  isBookmarked: (url) => ipcRenderer.invoke('bookmark-check', url),

  // Onboarding
  completeOnboarding: (choices) => ipcRenderer.invoke('onboarding-complete', choices),

  // Import
  importChrome: () => ipcRenderer.invoke('import-chrome-bookmarks'),
  importFirefox: () => ipcRenderer.invoke('import-firefox-bookmarks'),
  importSafari: () => ipcRenderer.invoke('import-safari-bookmarks'),
  importEdge: () => ipcRenderer.invoke('import-edge-bookmarks'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings-get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings-save', settings),
  injectCSS: (css) => ipcRenderer.invoke('inject-css', css),

  // Events (return unsubscribe functions to prevent listener leaks)
  onTabUpdate: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('tab-updated', h); return () => ipcRenderer.removeListener('tab-updated', h) },
  onActiveTabChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('active-tab-changed', h); return () => ipcRenderer.removeListener('active-tab-changed', h) },
  onLoadingStateChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('loading-state-changed', h); return () => ipcRenderer.removeListener('loading-state-changed', h) },
  onSpacesUpdate: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('spaces-updated', h); return () => ipcRenderer.removeListener('spaces-updated', h) },
  onFindResult: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('find-result', h); return () => ipcRenderer.removeListener('find-result', h) },
  onScreenshotDone: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('screenshot-done', h); return () => ipcRenderer.removeListener('screenshot-done', h) },
  onZoomChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('zoom-changed', h); return () => ipcRenderer.removeListener('zoom-changed', h) },
  onSplitChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('split-changed', h); return () => ipcRenderer.removeListener('split-changed', h) },
  onFocusChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('focus-changed', h); return () => ipcRenderer.removeListener('focus-changed', h) },
  onAudioStateChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('audio-state-changed', h); return () => ipcRenderer.removeListener('audio-state-changed', h) },
  onDownloadUpdate: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('download-update', h); return () => ipcRenderer.removeListener('download-update', h) },
  onDownloadComplete: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('download-complete', h); return () => ipcRenderer.removeListener('download-complete', h) },
  onSidebarVisibility: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('sidebar-visibility', h); return () => ipcRenderer.removeListener('sidebar-visibility', h) },
  onShortcut: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('shortcut', h); return () => ipcRenderer.removeListener('shortcut', h) },
  onAutoCollapse: (cb) => { const h = () => cb(); ipcRenderer.on('auto-collapse-sidebar', h); return () => ipcRenderer.removeListener('auto-collapse-sidebar', h) },
  onTabReopened: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('tab-reopened', h); return () => ipcRenderer.removeListener('tab-reopened', h) },

  // Pomodoro
  pomodoroStart: () => ipcRenderer.invoke('pomodoro-start'),
  pomodoroPause: () => ipcRenderer.invoke('pomodoro-pause'),
  pomodoroReset: () => ipcRenderer.invoke('pomodoro-reset'),
  pomodoroGet: () => ipcRenderer.invoke('pomodoro-get'),
  onPomodoroTick: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('pomodoro-tick', h); return () => ipcRenderer.removeListener('pomodoro-tick', h) },
  onPomodoroDone: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('pomodoro-done', h); return () => ipcRenderer.removeListener('pomodoro-done', h) },

  // Picture in Picture
  togglePip: () => ipcRenderer.invoke('pip-toggle'),

  // Reading Mode
  toggleReadingMode: () => ipcRenderer.invoke('reading-mode-toggle'),
  checkReadingMode: () => ipcRenderer.invoke('reading-mode-check'),

  // Screen Time
  getScreenTime: () => ipcRenderer.invoke('screen-time-get'),

  // Site Notes
  getSiteNotes: (domain) => ipcRenderer.invoke('site-notes-get', domain),
  saveSiteNotes: (domain, note) => ipcRenderer.invoke('site-notes-save', domain, note),
  getAllSiteNotes: () => ipcRenderer.invoke('site-notes-all'),

  // Tab Suspender
  wakeTab: (id) => ipcRenderer.invoke('tab-wake', id),

  // Panels
  rightPanelToggle: (width) => ipcRenderer.invoke('right-panel-toggle', width),

  // AI (Claude)
  aiPanelToggle: (visible) => ipcRenderer.invoke('ai-panel-toggle', visible),
  aiChat: (message) => ipcRenderer.invoke('ai-chat', message),
  aiClearChat: () => ipcRenderer.invoke('ai-clear-chat'),
  aiSummarize: () => ipcRenderer.invoke('ai-summarize'),
  aiExplain: (text) => ipcRenderer.invoke('ai-explain', text),
  aiPageQA: (question) => ipcRenderer.invoke('ai-page-qa', question),
  aiGetSelection: () => ipcRenderer.invoke('ai-get-selection'),
  onAiActionsExecuted: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('ai-actions-executed', h); return () => ipcRenderer.removeListener('ai-actions-executed', h) },

  // Ad Blocker
  adblockGetCount: () => ipcRenderer.invoke('adblock-get-count'),
  adblockToggle: (enabled) => ipcRenderer.invoke('adblock-toggle', enabled),
  onAdBlocked: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('ad-blocked', h); return () => ipcRenderer.removeListener('ad-blocked', h) },

  // AI Page Understanding
  onPageInsights: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('page-insights', h); return () => ipcRenderer.removeListener('page-insights', h) },
  aiPageInsight: (type) => ipcRenderer.invoke('ai-page-insight', type),

  // Tab reorder
  reorderTab: (fromId, toId) => ipcRenderer.invoke('tab-reorder', fromId, toId),

  // Overlay (hides BrowserView so overlays are visible)
  overlayShow: () => ipcRenderer.invoke('overlay-show'),
  overlayHide: () => ipcRenderer.invoke('overlay-hide'),

  // AI quick answer for URL bar
  aiQuickAnswer: (question) => ipcRenderer.invoke('ai-quick-answer', question),

  // History
  getHistory: (query) => ipcRenderer.invoke('history-get', query),
  clearHistory: () => ipcRenderer.invoke('history-clear'),
  deleteHistory: (id) => ipcRenderer.invoke('history-delete', id),

  // Reopen closed tab
  reopenTab: () => ipcRenderer.invoke('tab-reopen'),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('downloads-get'),
  openDownload: (path) => ipcRenderer.invoke('download-open', path),
  showDownload: (path) => ipcRenderer.invoke('download-show', path),

  // DevTools
  toggleDevTools: () => ipcRenderer.invoke('devtools-toggle'),

  // Print
  printPage: () => ipcRenderer.invoke('page-print'),

  // Stop loading
  stopLoading: () => ipcRenderer.invoke('tab-stop'),

  // Mute tab
  muteTab: (id) => ipcRenderer.invoke('tab-mute', id),

  // Private window
  openPrivateWindow: () => ipcRenderer.invoke('open-private-window'),

  // History suggestions for URL bar
  historySuggest: (query) => ipcRenderer.invoke('history-suggest', query),

  // Google search suggestions (safe server-side fetch)
  searchSuggestions: (query) => ipcRenderer.invoke('search-suggestions', query),
})

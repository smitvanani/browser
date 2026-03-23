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

  // Events
  onTabUpdate: (cb) => ipcRenderer.on('tab-updated', (e, d) => cb(d)),
  onActiveTabChanged: (cb) => ipcRenderer.on('active-tab-changed', (e, d) => cb(d)),
  onLoadingStateChanged: (cb) => ipcRenderer.on('loading-state-changed', (e, d) => cb(d)),
  onSpacesUpdate: (cb) => ipcRenderer.on('spaces-updated', (e, d) => cb(d)),
  onFindResult: (cb) => ipcRenderer.on('find-result', (e, d) => cb(d)),
  onScreenshotDone: (cb) => ipcRenderer.on('screenshot-done', (e, d) => cb(d)),
  onZoomChanged: (cb) => ipcRenderer.on('zoom-changed', (e, d) => cb(d)),
  onSplitChanged: (cb) => ipcRenderer.on('split-changed', (e, d) => cb(d)),
  onFocusChanged: (cb) => ipcRenderer.on('focus-changed', (e, d) => cb(d)),
  onAudioStateChanged: (cb) => ipcRenderer.on('audio-state-changed', (e, d) => cb(d)),
  onDownloadUpdate: (cb) => ipcRenderer.on('download-update', (e, d) => cb(d)),
  onDownloadComplete: (cb) => ipcRenderer.on('download-complete', (e, d) => cb(d)),
  onSidebarVisibility: (cb) => ipcRenderer.on('sidebar-visibility', (e, d) => cb(d)),
  onShortcut: (cb) => ipcRenderer.on('shortcut', (e, d) => cb(d)),
  onAutoCollapse: (cb) => ipcRenderer.on('auto-collapse-sidebar', () => cb()),

  // Pomodoro
  pomodoroStart: () => ipcRenderer.invoke('pomodoro-start'),
  pomodoroPause: () => ipcRenderer.invoke('pomodoro-pause'),
  pomodoroReset: () => ipcRenderer.invoke('pomodoro-reset'),
  pomodoroGet: () => ipcRenderer.invoke('pomodoro-get'),
  onPomodoroTick: (cb) => ipcRenderer.on('pomodoro-tick', (e, d) => cb(d)),
  onPomodoroDone: (cb) => ipcRenderer.on('pomodoro-done', (e, d) => cb(d)),

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
  onAiActionsExecuted: (cb) => ipcRenderer.on('ai-actions-executed', (e, d) => cb(d)),

  // Ad Blocker
  adblockGetCount: () => ipcRenderer.invoke('adblock-get-count'),
  adblockToggle: (enabled) => ipcRenderer.invoke('adblock-toggle', enabled),
  onAdBlocked: (cb) => ipcRenderer.on('ad-blocked', (e, d) => cb(d)),

  // AI Page Understanding
  onPageInsights: (cb) => ipcRenderer.on('page-insights', (e, d) => cb(d)),
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
})

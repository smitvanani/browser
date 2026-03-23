import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import type { TabInfo, SpaceInfo, Settings, ContextMenuItem, ToastData, DownloadInfo } from '../types'

const api = () => (window as any).browserAPI

interface BrowserContextType {
  // Tabs
  tabs: TabInfo[]
  activeTabId: number | null
  createTab: (url?: string) => void
  closeTab: (id: number) => void
  switchTab: (id: number) => void
  pinTab: (id: number, pinned: boolean) => void

  // Spaces
  spaces: SpaceInfo[]
  activeSpaceId: number | null
  createSpace: (name: string, color: string) => void
  switchSpace: (id: number) => void
  deleteSpace: (id: number) => void

  // Navigation
  navigate: (url: string) => void
  goBack: () => void
  goForward: () => void
  reload: () => void

  // Sidebar
  sidebarCollapsed: boolean
  sidebarHidden: boolean
  toggleSidebar: () => void

  // Theme
  darkMode: boolean
  toggleTheme: () => void

  // Loading
  isLoading: boolean

  // Bookmarks
  bookmarks: { url: string; title: string }[]
  currentIsBookmarked: boolean
  toggleBookmark: () => void

  // Settings
  settings: Settings
  saveSetting: (key: string, value: any) => void

  // Find
  findBarVisible: boolean
  showFindBar: () => void
  hideFindBar: () => void

  // URL bar
  urlBarVisible: boolean
  showUrlBar: () => void
  hideUrlBar: () => void

  // Settings panel
  settingsPanelVisible: boolean
  showSettingsPanel: () => void
  hideSettingsPanel: () => void

  // AI panel
  aiPanelVisible: boolean
  toggleAiPanel: () => void

  // Notes panel
  notesPanelVisible: boolean
  toggleNotesPanel: () => void

  // Screen time panel
  screenTimePanelVisible: boolean
  toggleScreenTimePanel: () => void

  // History & Downloads panels
  historyPanelVisible: boolean
  toggleHistoryPanel: () => void
  downloadsPanelVisible: boolean
  toggleDownloadsPanel: () => void

  // Context menu
  contextMenu: { visible: boolean; x: number; y: number; items: ContextMenuItem[] }
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void
  hideContextMenu: () => void

  // Toast
  toast: ToastData | null
  showToast: (icon: string, text: string) => void

  // Zoom
  zoomLevel: number | null

  // Downloads
  downloads: DownloadInfo[]

  // Screenshot
  screenshotFlash: boolean

  // Split
  splitActive: boolean

  // Ad block
  adBlockCount: number

  // Pomodoro
  pomodoroVisible: boolean
  togglePomodoro: () => void
}

const BrowserContext = createContext<BrowserContextType | null>(null)

export function useBrowser() {
  const ctx = useContext(BrowserContext)
  if (!ctx) throw new Error('useBrowser must be inside BrowserProvider')
  return ctx
}

export function BrowserProvider({ children }: { children: ReactNode }) {
  // State
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [activeTabId, setActiveTabId] = useState<number | null>(null)
  const [spaces, setSpaces] = useState<SpaceInfo[]>([])
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [bookmarks, setBookmarks] = useState<{ url: string; title: string }[]>([])
  const [currentIsBookmarked, setCurrentIsBookmarked] = useState(false)
  const [settings, setSettings] = useState<Settings>({})
  const [findBarVisible, setFindBarVisible] = useState(false)
  const [urlBarVisible, setUrlBarVisible] = useState(false)
  const [settingsPanelVisible, setSettingsPanelVisible] = useState(false)
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [notesPanelVisible, setNotesPanelVisible] = useState(false)
  const [screenTimePanelVisible, setScreenTimePanelVisible] = useState(false)
  const [historyPanelVisible, setHistoryPanelVisible] = useState(false)
  const [downloadsPanelVisible, setDownloadsPanelVisible] = useState(false)

  // Close all right-side panels
  const closeAllRightPanels = useCallback(() => {
    setSettingsPanelVisible(false)
    setAiPanelVisible(false)
    setNotesPanelVisible(false)
    setScreenTimePanelVisible(false)
    setHistoryPanelVisible(false)
    setDownloadsPanelVisible(false)
    api()?.rightPanelToggle(0)
    api()?.aiPanelToggle(false)
  }, [])
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; items: ContextMenuItem[] }>({ visible: false, x: 0, y: 0, items: [] })
  const [toast, setToast] = useState<ToastData | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number | null>(null)
  const [downloads, setDownloads] = useState<DownloadInfo[]>([])
  const [screenshotFlash, setScreenshotFlash] = useState(false)
  const [splitActive, setSplitActive] = useState(false)
  const [adBlockCount, setAdBlockCount] = useState(0)
  const [pomodoroVisible, setPomodoroVisible] = useState(false)

  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoomTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize
  useEffect(() => {
    const b = api()
    if (!b) return

    // Load settings
    b.getSettings().then((s: Settings) => {
      setSettings(s)
      const theme = s.theme || 'system'
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme:dark)').matches)
      setDarkMode(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    })

    // Load bookmarks
    b.getBookmarks().then((bm: any[]) => setBookmarks(bm || []))

    // IPC listeners
    b.onTabUpdate((data: any) => {
      setTabs(data.tabs || [])
      setActiveTabId(data.activeTabId)
    })

    b.onActiveTabChanged((data: any) => {
      setActiveTabId(data.activeTabId ?? data.id)
    })

    let loadingTimeout: ReturnType<typeof setTimeout> | null = null
    b.onLoadingStateChanged((data: any) => {
      if (data.loading) {
        loadingTimeout = setTimeout(() => setIsLoading(true), 300)
      } else {
        if (loadingTimeout) clearTimeout(loadingTimeout)
        setIsLoading(false)
      }
    })

    b.onSpacesUpdate((data: any) => {
      setSpaces(data.spaces || [])
      setActiveSpaceId(data.activeSpaceId)
    })

    b.onZoomChanged((data: any) => {
      setZoomLevel(data.zoom)
      if (zoomTimeout.current) clearTimeout(zoomTimeout.current)
      zoomTimeout.current = setTimeout(() => setZoomLevel(null), 1500)
    })

    b.onSplitChanged((data: any) => {
      setSplitActive(data.active)
    })

    b.onFocusChanged((data: any) => {
      setSidebarHidden(data.active)
    })

    b.onSidebarVisibility((data: any) => {
      setSidebarHidden(data.hidden)
    })

    b.onAutoCollapse(() => {
      setSidebarCollapsed(true)
    })

    b.onDownloadUpdate((data: any) => {
      setDownloads(data.downloads || [])
    })

    b.onScreenshotDone(() => {
      setScreenshotFlash(true)
      setTimeout(() => setScreenshotFlash(false), 400)
    })

    b.onAdBlocked((data: any) => {
      setAdBlockCount(data.count || 0)
    })

    // Keyboard shortcuts from native menu
    b.onShortcut((action: string) => {
      switch (action) {
        case 'find': setFindBarVisible(true); api()?.overlayShow(); break
        case 'url': setUrlBarVisible(true); api()?.overlayShow(); break
        case 'settings': setSettingsPanelVisible(v => !v); break
        case 'ai': setAiPanelVisible(v => { const next = !v; api()?.aiPanelToggle(next); return next }); break
        case 'screenshot': api()?.screenshot(); break
        case 'reading-mode':
          api()?.toggleReadingMode().then((on: boolean) => {
            setToast({ icon: on ? '\u{1F4D6}' : '\u{1F310}', text: on ? 'Reading mode on' : 'Reading mode off' })
            setTimeout(() => setToast(null), 2500)
          })
          break
        case 'pip':
          api()?.togglePip().then((ok: boolean) => {
            if (!ok) { setToast({ icon: '\u{1F4FA}', text: 'No video found' }); setTimeout(() => setToast(null), 2500) }
          })
          break
        case 'screen-time': setScreenTimePanelVisible(v => { const next = !v; api()?.rightPanelToggle(next ? 420 : 0); return next }); break
        case 'history': setHistoryPanelVisible(v => { const next = !v; api()?.rightPanelToggle(next ? 420 : 0); return next }); break
        case 'downloads': setDownloadsPanelVisible(v => { const next = !v; api()?.rightPanelToggle(next ? 420 : 0); return next }); break
        case 'bookmarks': window.dispatchEvent(new Event('toggle-bookmarks')); break
        case 'import-bookmarks': setSettingsPanelVisible(true); api()?.rightPanelToggle(420); break
        case 'history-cleared':
          setToast({ icon: '\u{1F5D1}', text: 'History cleared' })
          setTimeout(() => setToast(null), 2500)
          break
        case 'bookmark-this':
          (async () => {
            const info = await api()?.getActiveTabInfo()
            if (info?.url && !info.url.startsWith('file://')) {
              const exists = await api()?.checkBookmark(info.url)
              if (exists) { await api()?.removeBookmark(info.url); setCurrentIsBookmarked(false) }
              else { await api()?.addBookmark(info.url, info.title); setCurrentIsBookmarked(true) }
              const bm = await api()?.getBookmarks()
              setBookmarks(bm || [])
            }
          })()
          break
        case 'ai-summarize':
          setAiPanelVisible(v => { if (!v) api()?.aiPanelToggle(true); return true })
          setTimeout(() => api()?.aiSummarize(), 300)
          break
      }
    })

    // Download complete toast
    b.onDownloadComplete((data: { filename: string }) => {
      setToast({ icon: '\u2705', text: `Downloaded: ${data.filename}` })
      setTimeout(() => setToast(null), 3000)
    })
  }, [])

  // Direct keyboard shortcuts (fallback when menu accelerators don't reach renderer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      else if (e.key === 'l') { e.preventDefault(); setUrlBarVisible(true); api()?.overlayShow() }
      else if (e.key === 'f' && !e.shiftKey) { e.preventDefault(); setFindBarVisible(true); api()?.overlayShow() }
      else if (e.key === ',') { e.preventDefault(); setSettingsPanelVisible(v => !v) }
      else if (e.key === 'j') { e.preventDefault(); setAiPanelVisible(v => { const next = !v; api()?.aiPanelToggle(next); return next }) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Sidebar width sync
  useEffect(() => {
    const b = api()
    if (!b) return
    const w = sidebarHidden ? 0 : (sidebarCollapsed ? 56 : 260)
    b.setSidebarWidth(w)
  }, [sidebarCollapsed, sidebarHidden])

  // Check bookmark status when active tab changes
  useEffect(() => {
    const b = api()
    if (!b) return
    const tab = tabs.find(t => t.id === activeTabId)
    if (tab && tab.url) {
      b.isBookmarked(tab.url).then((v: boolean) => setCurrentIsBookmarked(v))
    }
  }, [activeTabId, tabs, bookmarks])

  // Actions
  const createTab = useCallback((url?: string) => { api()?.createTab(url) }, [])
  const closeTab = useCallback((id: number) => { api()?.closeTab(id) }, [])
  const switchTab = useCallback((id: number) => { api()?.switchTab(id) }, [])
  const pinTab = useCallback((id: number, pinned: boolean) => { api()?.pinTab(id, pinned) }, [])
  const navigate = useCallback((url: string) => { api()?.navigate(url) }, [])
  const goBack = useCallback(() => { api()?.goBack() }, [])
  const goForward = useCallback(() => { api()?.goForward() }, [])
  const reload = useCallback(() => { api()?.reload() }, [])

  const createSpace = useCallback((name: string, color: string) => { api()?.createSpace(name, color) }, [])
  const switchSpace = useCallback((id: number) => { api()?.switchSpace(id) }, [])
  const deleteSpace = useCallback((id: number) => { api()?.deleteSpace(id) }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  const toggleTheme = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev
      saveSetting('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  const saveSetting = useCallback((key: string, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      api()?.saveSettings(next)
      return next
    })
  }, [])

  const toggleBookmark = useCallback(async () => {
    const b = api()
    if (!b) return
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    if (currentIsBookmarked) {
      await b.removeBookmark(tab.url)
    } else {
      await b.addBookmark(tab.url, tab.title)
    }
    const bm = await b.getBookmarks()
    setBookmarks(bm || [])
    const isB = await b.isBookmarked(tab.url)
    setCurrentIsBookmarked(isB)
  }, [tabs, activeTabId, currentIsBookmarked])

  const showToast = useCallback((icon: string, text: string) => {
    setToast({ icon, text })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(null), 2500)
  }, [])

  const showContextMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setContextMenu({ visible: true, x, y, items })
  }, [])
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }))
  }, [])

  const value: BrowserContextType = {
    tabs, activeTabId, createTab, closeTab, switchTab, pinTab,
    spaces, activeSpaceId, createSpace, switchSpace, deleteSpace,
    navigate, goBack, goForward, reload,
    sidebarCollapsed, sidebarHidden, toggleSidebar,
    darkMode, toggleTheme,
    isLoading,
    bookmarks, currentIsBookmarked, toggleBookmark,
    settings, saveSetting,
    findBarVisible,
    showFindBar: () => { setFindBarVisible(true); api()?.overlayShow() },
    hideFindBar: () => { setFindBarVisible(false); api()?.overlayHide() },
    urlBarVisible,
    showUrlBar: () => { setUrlBarVisible(true); api()?.overlayShow() },
    hideUrlBar: () => { setUrlBarVisible(false); api()?.overlayHide() },
    settingsPanelVisible,
    showSettingsPanel: () => {
      closeAllRightPanels()
      setSettingsPanelVisible(true)
      api()?.rightPanelToggle(420)
    },
    hideSettingsPanel: () => {
      setSettingsPanelVisible(false)
      api()?.rightPanelToggle(0)
    },
    aiPanelVisible, toggleAiPanel: () => {
      const willOpen = !aiPanelVisible
      closeAllRightPanels()
      if (willOpen) { setAiPanelVisible(true); api()?.aiPanelToggle(true) }
    },
    notesPanelVisible, toggleNotesPanel: () => {
      const willOpen = !notesPanelVisible
      closeAllRightPanels()
      if (willOpen) { setNotesPanelVisible(true); api()?.rightPanelToggle(360) }
    },
    screenTimePanelVisible, toggleScreenTimePanel: () => {
      const willOpen = !screenTimePanelVisible
      closeAllRightPanels()
      if (willOpen) { setScreenTimePanelVisible(true); api()?.rightPanelToggle(360) }
    },
    historyPanelVisible, toggleHistoryPanel: () => {
      const willOpen = !historyPanelVisible
      closeAllRightPanels()
      if (willOpen) { setHistoryPanelVisible(true); api()?.rightPanelToggle(420) }
    },
    downloadsPanelVisible, toggleDownloadsPanel: () => {
      const willOpen = !downloadsPanelVisible
      closeAllRightPanels()
      if (willOpen) { setDownloadsPanelVisible(true); api()?.rightPanelToggle(420) }
    },
    contextMenu, showContextMenu, hideContextMenu,
    toast, showToast,
    zoomLevel,
    downloads,
    screenshotFlash,
    splitActive,
    adBlockCount,
    pomodoroVisible, togglePomodoro: () => setPomodoroVisible(v => !v),
  }

  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
}

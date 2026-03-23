import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import LoadingBar from './components/Overlays/LoadingBar'
import LoadingOverlay from './components/Overlays/LoadingOverlay'
import ScreenshotFlash from './components/Overlays/ScreenshotFlash'
import ZoomIndicator from './components/Overlays/ZoomIndicator'
import Toast from './components/Overlays/Toast'
import SplitDivider from './components/Overlays/SplitDivider'
import DownloadIndicator from './components/Overlays/DownloadIndicator'
import FindBar from './components/Navigation/FindBar'
import UrlBar from './components/Navigation/UrlBar'
import ContextMenu from './components/ContextMenu/ContextMenu'
import SettingsPanel from './components/Panels/SettingsPanel'
import AiPanel from './components/Panels/AiPanel'
import NotesPanel from './components/Panels/NotesPanel'
import ScreenTimePanel from './components/Panels/ScreenTimePanel'
import HistoryPanel from './components/Panels/HistoryPanel'
import DownloadsPanel from './components/Panels/DownloadsPanel'
import PomodoroWidget from './components/Widgets/PomodoroWidget'
import BookmarksDropdown from './components/Widgets/BookmarksDropdown'
import { BrowserProvider, useBrowser } from './hooks/useBrowser'

function AppContent() {
  const { sidebarCollapsed, sidebarHidden } = useBrowser()
  const sidebarWidth = sidebarHidden ? 0 : (sidebarCollapsed ? 56 : 260)

  return (
    <>
      <LoadingBar sidebarWidth={sidebarWidth} />
      <LoadingOverlay sidebarWidth={sidebarWidth} />
      <ScreenshotFlash />
      <ZoomIndicator />
      <Toast />
      <SplitDivider sidebarWidth={sidebarWidth} />

      <Sidebar />

      <DownloadIndicator sidebarWidth={sidebarWidth} />
      <FindBar />
      <UrlBar sidebarWidth={sidebarWidth} />
      <ContextMenu />
      <SettingsPanel sidebarWidth={sidebarWidth} />
      <AiPanel />
      <NotesPanel />
      <ScreenTimePanel />
      <HistoryPanel />
      <DownloadsPanel />
      <PomodoroWidget />
      <BookmarksDropdown />
    </>
  )
}

export default function App() {
  return (
    <BrowserProvider>
      <AppContent />
    </BrowserProvider>
  )
}

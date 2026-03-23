export interface TabInfo {
  id: number
  title: string
  url: string
  pinned: boolean
  loading: boolean
  audible: boolean
  suspended?: boolean
  favicon?: string
}

export interface SpaceInfo {
  id: number
  name: string
  color?: string
  accent?: string
  gradient?: string
  colorIndex?: number
  tabCount: number
}

export interface Settings {
  theme?: string
  accentColor?: string
  userName?: string
  searchEngine?: string
  quickLinks?: QuickLink[]
  customCSS?: string
  adBlockEnabled?: boolean
  [key: string]: any
}

export interface QuickLink {
  name: string
  url: string
  icon?: string
  color?: string
}

export interface ContextMenuItem {
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  separator?: boolean
  action?: () => void
}

export interface ToastData {
  icon: string
  text: string
}

export interface DownloadInfo {
  id: number
  filename: string
  total: number
  received: number
  state: string
}

export interface BookmarkInfo {
  url: string
  title: string
}

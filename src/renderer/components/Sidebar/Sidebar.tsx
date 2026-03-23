import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'
import DragRegion from './DragRegion'
import SpacesBar from './SpacesBar'
import TabList from './TabList'
import NewTabButton from './NewTabButton'
import SidebarActions from './SidebarActions'

export default function Sidebar() {
  const { sidebarCollapsed, sidebarHidden } = useBrowser()

  const className =
    'sidebar' +
    (sidebarCollapsed ? ' collapsed' : '') +
    (sidebarHidden ? ' hidden' : '')

  return (
    <div className={className} id="sidebar">
      <DragRegion />
      <SpacesBar />
      <TabList />
      <NewTabButton />
      <SidebarActions />
    </div>
  )
}

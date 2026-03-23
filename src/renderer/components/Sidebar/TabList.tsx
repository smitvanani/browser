import React, { useState, useCallback, useRef } from 'react'
import { useBrowser } from '../../hooks/useBrowser'
import TabItem from './TabItem'

const browserAPI = () => (window as any).browserAPI

export default function TabList() {
  const { tabs } = useBrowser()
  const [dragId, setDragId] = useState<number | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  const pinnedTabs = tabs.filter(t => t.pinned)
  const regularTabs = tabs.filter(t => !t.pinned)

  const handleDragStart = useCallback((e: React.DragEvent, tabId: number) => {
    setDragId(tabId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(tabId))
    // Make drag image semi-transparent
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '0.5'
    setTimeout(() => { el.style.opacity = '1' }, 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, tabId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (tabId !== dragId) setDropTargetId(tabId)
  }, [dragId])

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, toTabId: number) => {
    e.preventDefault()
    if (dragId !== null && dragId !== toTabId) {
      browserAPI()?.reorderTab(dragId, toTabId)
    }
    setDragId(null)
    setDropTargetId(null)
  }, [dragId])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDropTargetId(null)
  }, [])

  const renderTab = (tab: any) => (
    <div
      key={tab.id}
      draggable
      onDragStart={(e) => handleDragStart(e, tab.id)}
      onDragOver={(e) => handleDragOver(e, tab.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, tab.id)}
      onDragEnd={handleDragEnd}
      className={
        'tab-drag-wrapper' +
        (dragId === tab.id ? ' dragging' : '') +
        (dropTargetId === tab.id ? ' drop-target' : '')
      }
    >
      <TabItem tab={tab} />
    </div>
  )

  return (
    <>
      {pinnedTabs.length > 0 && (
        <>
          <div className="pinned-list">
            {pinnedTabs.map(renderTab)}
          </div>
          <div className="section-label">Pinned</div>
        </>
      )}
      <div className="sidebar-tabs" ref={dragRef}>
        <div className="tab-list">
          {regularTabs.map(renderTab)}
        </div>
      </div>
    </>
  )
}

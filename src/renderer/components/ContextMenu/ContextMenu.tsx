import React, { useEffect, useRef, useState } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

export default function ContextMenu() {
  const { contextMenu, hideContextMenu } = useBrowser()
  const menuRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)

  // Animate on show, hide on click outside
  useEffect(() => {
    if (contextMenu.visible) {
      // Force reflow then add animated class
      setAnimated(false)
      requestAnimationFrame(() => {
        setAnimated(true)
      })
    } else {
      setAnimated(false)
    }
  }, [contextMenu.visible])

  // Click outside to hide
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenu.visible && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [contextMenu.visible, hideContextMenu])

  if (!contextMenu.visible) return null

  return (
    <div
      ref={menuRef}
      className={`context-menu${animated ? ' animated' : ''}`}
      style={{
        display: 'block',
        left: contextMenu.x + 'px',
        top: contextMenu.y + 'px'
      }}
    >
      {contextMenu.items.map((item, i) => {
        if (item.separator) {
          return <div key={`sep-${i}`} className="context-menu-sep" />
        }
        return (
          <div
            key={`item-${i}`}
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              item.action?.()
              hideContextMenu()
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
            {item.shortcut && <span className="cm-shortcut">{item.shortcut}</span>}
          </div>
        )
      })}
    </div>
  )
}

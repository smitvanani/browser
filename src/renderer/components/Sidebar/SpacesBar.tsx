import React, { useState, useRef, useEffect } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

export default function SpacesBar() {
  const { spaces, activeSpaceId, switchSpace, createSpace, deleteSpace, showContextMenu } = useBrowser()
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const handleNewSpace = () => {
    if (showInput) {
      inputRef.current?.focus()
      return
    }
    submittedRef.current = false
    setShowInput(true)
    setInputValue('')
  }

  const submittedRef = useRef(false)

  const finishInput = () => {
    if (submittedRef.current) return
    submittedRef.current = true
    const name = inputValue.trim()
    setShowInput(false)
    setInputValue('')
    if (name) {
      const colors = ['#f5576c', '#fda085', '#a6e3a1', '#667eea', '#764ba2', '#ffd93d', '#89f7fe', '#fbc2eb']
      const color = colors[Math.floor(Math.random() * colors.length)]
      createSpace(name, color)
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const handleSpaceContextMenu = (e: React.MouseEvent, space: { id: number; name: string; tabCount?: number }) => {
    e.preventDefault()
    if (spaces.length > 1) {
      showContextMenu(e.clientX, e.clientY, [
        {
          label: confirmDeleteId === space.id
            ? `Confirm delete "${space.name}"?`
            : `Delete "${space.name}" (${space.tabCount || 0} tabs)`,
          danger: true,
          action: () => {
            if (confirmDeleteId === space.id) {
              deleteSpace(space.id)
              setConfirmDeleteId(null)
            } else {
              setConfirmDeleteId(space.id)
              setTimeout(() => setConfirmDeleteId(null), 4000)
            }
          },
        },
      ])
    }
  }

  return (
    <>
      <div className="spaces-bar">
        {spaces.map(space => (
          <div
            key={space.id}
            className={'space-dot' + (space.id === activeSpaceId ? ' active' : '')}
            style={{ background: space.accent || space.color || '#667eea' }}
            title={`${space.name} (${space.tabCount || 0} tabs)`}
            onClick={() => switchSpace(space.id)}
            onContextMenu={e => handleSpaceContextMenu(e, space)}
          >
            {(space.name[0] || '?').toUpperCase()}
            {space.id !== activeSpaceId && (space.tabCount || 0) > 0 && (
              <span className="space-dot-count">{space.tabCount}</span>
            )}
          </div>
        ))}
        <button className="space-add" title="New Space" onClick={handleNewSpace}>
          +
        </button>
      </div>
      {showInput && (
        <div style={{ padding: '0 12px 6px' }}>
          <input
            ref={inputRef}
            id="space-name-input"
            placeholder="Space name..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') finishInput()
              if (e.key === 'Escape') { setShowInput(false); setInputValue('') }
            }}
            onBlur={() => {
              // Small delay so Enter keydown fires before blur closes the input
              setTimeout(finishInput, 150)
            }}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--accent, #667eea)',
              background: 'var(--sidebar-hover)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              margin: '4px 0',
            }}
          />
        </div>
      )}
    </>
  )
}

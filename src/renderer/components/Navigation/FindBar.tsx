import React, { useEffect, useRef, useState } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const browserAPI = () => (window as any).browserAPI

export default function FindBar() {
  const { findBarVisible, hideFindBar } = useBrowser()
  const inputRef = useRef<HTMLInputElement>(null)
  const [matchCount, setMatchCount] = useState('')

  // Auto-focus input when find bar becomes visible
  useEffect(() => {
    if (findBarVisible && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [findBarVisible])

  // Listen for find results
  useEffect(() => {
    const api = browserAPI()
    if (!api) return
    const handler = (data: { activeMatch: number; matches: number }) => {
      setMatchCount(`${data.activeMatch}/${data.matches}`)
    }
    api.onFindResult(handler)
  }, [])

  const handleClose = () => {
    browserAPI()?.stopFind()
    setMatchCount('')
    hideFindBar()
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value
    if (value) {
      browserAPI()?.findInPage(value)
    } else {
      setMatchCount('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        browserAPI()?.findPrevious()
      } else {
        browserAPI()?.findNext()
      }
    }
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <div className={`find-bar${findBarVisible ? ' visible' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        id="find-input"
        placeholder="find in page..."
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />
      <span className="find-count">{matchCount}</span>
      <button onClick={() => browserAPI()?.findPrevious()}>&#x25B2;</button>
      <button onClick={() => browserAPI()?.findNext()}>&#x25BC;</button>
      <button onClick={handleClose}>&#x2715;</button>
    </div>
  )
}

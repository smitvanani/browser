import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useBrowser } from '../../hooks/useBrowser'
import type { BookmarkInfo } from '../../types'

const browserAPI = () => (window as any).browserAPI

interface Suggestion {
  type: 'google' | 'bookmark' | 'tab' | 'history'
  label: string
  subtitle?: string
  icon: string
  url?: string
  tabId?: number
}

function isQuestion(text: string): boolean {
  const q = text.toLowerCase().trim()
  const questionWords = ['what', 'how', 'why', 'who', 'when', 'where', 'which', 'can', 'is', 'are', 'do', 'does', 'will', 'should', 'could', 'would', 'tell me', 'explain', 'define', 'describe']
  return q.endsWith('?') || questionWords.some(w => q.startsWith(w + ' '))
}

interface UrlBarProps {
  sidebarWidth: number
}

export default function UrlBar({ sidebarWidth }: UrlBarProps) {
  const {
    urlBarVisible, hideUrlBar, navigate, switchTab,
    bookmarks, tabs, activeTabId, currentIsBookmarked,
    toggleBookmark, settings
  } = useBrowser()

  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show URL bar: pre-fill with current tab URL and focus
  useEffect(() => {
    if (urlBarVisible) {
      const api = browserAPI()
      if (api) {
        api.getActiveTabInfo().then((info: any) => {
          const isNewTab = !info || !info.url || info.url === 'about:blank' || info.url.startsWith('file://')
          setInputValue(isNewTab ? '' : info.url)
          setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
          }, 50)
        })
      }
    } else {
      setSuggestions([])
      setSelectedIndex(-1)
      setAiAnswer(null)
      setAiLoading(false)
    }
  }, [urlBarVisible])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setSelectedIndex(-1)
  }, [])

  const fetchSuggestions = useCallback((query: string) => {
    if (!query || query.startsWith('http://') || query.startsWith('https://')) {
      clearSuggestions()
      return
    }

    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current)

    suggestTimeoutRef.current = setTimeout(async () => {
      const q = query.toLowerCase()

      // Fetch history suggestions from backend
      let matchingHistory: Suggestion[] = []
      try {
        const api = browserAPI()
        if (api) {
          const results = await api.historySuggest(query)
          matchingHistory = (results || []).slice(0, 4).map((h: any) => ({
            type: 'history' as const,
            label: h.title || h.url,
            subtitle: h.url,
            icon: '\u{1F552}',
            url: h.url
          }))
        }
      } catch {}

      // Filter matching bookmarks
      const matchingBookmarks: Suggestion[] = bookmarks
        .filter((b: BookmarkInfo) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
        .slice(0, 3)
        .map((b: BookmarkInfo) => ({
          type: 'bookmark' as const,
          label: b.title || b.url,
          subtitle: b.url,
          icon: '\u2606',
          url: b.url
        }))

      // Filter matching open tabs
      const matchingTabs: Suggestion[] = tabs
        .filter(t => {
          const title = (t.title || '').toLowerCase()
          const url = (t.url || '').toLowerCase()
          return title.includes(q) || url.includes(q)
        })
        .slice(0, 3)
        .map(t => ({
          type: 'tab' as const,
          label: t.title || 'New Tab',
          subtitle: t.url,
          icon: '\u{1F5D7}',
          tabId: t.id
        }))

      // Deduplicate history against bookmarks and tabs
      const usedUrls = new Set([
        ...matchingBookmarks.map(b => b.url),
        ...matchingTabs.map(t => t.subtitle)
      ])
      matchingHistory = matchingHistory.filter(h => !usedUrls.has(h.url))

      // Fetch Google suggestions
      const googlePromise = new Promise<Suggestion[]>((resolve) => {
        const old = document.getElementById('suggest-script')
        if (old) old.remove()

        const timeout = setTimeout(() => resolve([]), 1500)
        ;(window as any).handleSuggestions = (data: any) => {
          clearTimeout(timeout)
          resolve(((data[1] || []) as string[]).slice(0, 5).map((text: string) => ({
            type: 'google' as const,
            label: text,
            icon: '\u{1F50D}'
          })))
        }

        const s = document.createElement('script')
        s.id = 'suggest-script'
        s.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&callback=handleSuggestions`
        document.head.appendChild(s)
      })

      const googleSuggestions = await googlePromise

      const all = [...matchingTabs, ...matchingHistory, ...matchingBookmarks, ...googleSuggestions]
      setSuggestions(all)
      setSelectedIndex(-1)
    }, 150)
  }, [bookmarks, tabs, clearSuggestions])

  const navigateOrSearch = useCallback(() => {
    const input = inputValue.trim()
    if (!input) return

    // Check if it's clearly a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      navigate(input)
      hideUrlBar()
      return
    }

    // Check if it looks like a domain
    if (input.includes('.') && !input.includes(' ') && input.length < 100) {
      navigate('https://' + input)
      hideUrlBar()
      return
    }

    // Default: search engine
    const engines: Record<string, string> = {
      google: 'https://www.google.com/search?q=',
      duckduckgo: 'https://duckduckgo.com/?q=',
      bing: 'https://www.bing.com/search?q=',
      brave: 'https://search.brave.com/search?q='
    }
    const engineUrl = engines[settings.searchEngine || 'google'] || engines.google
    navigate(engineUrl + encodeURIComponent(input))
    hideUrlBar()
  }, [inputValue, navigate, hideUrlBar, settings])

  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    if (suggestion.type === 'tab' && suggestion.tabId !== undefined) {
      switchTab(suggestion.tabId)
      hideUrlBar()
    } else if (suggestion.url) {
      navigate(suggestion.url)
      hideUrlBar()
    } else {
      setInputValue(suggestion.label)
      // Trigger search with the suggestion text
      const engines: Record<string, string> = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        bing: 'https://www.bing.com/search?q=',
        brave: 'https://search.brave.com/search?q='
      }
      const engineUrl = engines[settings.searchEngine || 'google'] || engines.google
      navigate(engineUrl + encodeURIComponent(suggestion.label))
      hideUrlBar()
    }
  }, [navigate, switchTab, hideUrlBar, settings])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(selectedIndex + 1, suggestions.length - 1)
      setSelectedIndex(next)
      if (suggestions[next]) setInputValue(suggestions[next].label)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(selectedIndex - 1, -1)
      setSelectedIndex(next)
      if (next >= 0 && suggestions[next]) setInputValue(suggestions[next].label)
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex])
      } else {
        navigateOrSearch()
      }
    } else if (e.key === 'Escape') {
      hideUrlBar()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setSelectedIndex(-1)
    fetchSuggestions(val.trim())

    // AI quick answer for questions
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current)
    const trimmed = val.trim()
    if (isQuestion(trimmed) && trimmed.length > 8) {
      setAiLoading(true)
      setAiAnswer(null)
      aiTimeoutRef.current = setTimeout(async () => {
        try {
          const api = browserAPI()
          if (api?.aiQuickAnswer) {
            const answer = await api.aiQuickAnswer(trimmed)
            if (answer) setAiAnswer(answer)
          }
        } catch {}
        setAiLoading(false)
      }, 600)
    } else {
      setAiAnswer(null)
      setAiLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('url-overlay')) {
      hideUrlBar()
    }
  }

  const hasSuggestions = suggestions.length > 0

  return (
    <div
      className={`url-overlay${urlBarVisible ? ' visible' : ''}`}
      style={{ left: sidebarWidth + 'px', width: `calc(100% - ${sidebarWidth}px)` }}
      onClick={handleOverlayClick}
    >
      <div className="url-bar-wrapper">
        <div className={`url-bar-container${hasSuggestions ? ' has-suggestions' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            id="url-input"
            placeholder="Search, URL, or ask AI..."
            autoComplete="off"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`bm-btn${currentIsBookmarked ? ' bookmarked' : ''}`}
            title="Bookmark"
            onClick={toggleBookmark}
          >
            {currentIsBookmarked ? '\u2605' : '\u2606'}
          </button>
        </div>
        {/* AI Answer Card */}
        {(aiLoading || aiAnswer) && (
          <div className="ai-answer-card">
            <div className="ai-answer-header">
              <span className="ai-answer-icon">{'\u2728'}</span>
              <span className="ai-answer-label">Nova AI</span>
            </div>
            {aiLoading && !aiAnswer ? (
              <div className="ai-answer-loading">
                <div className="ai-answer-dots">
                  <span /><span /><span />
                </div>
                <span>Thinking...</span>
              </div>
            ) : (
              <div className="ai-answer-text">{aiAnswer}</div>
            )}
          </div>
        )}
        {hasSuggestions && (
          <div className="suggestions-list has-items">
            {suggestions.map((s, i) => (
              <div
                key={`${s.type}-${s.label}-${i}`}
                className={`suggestion-item${i === selectedIndex ? ' selected' : ''}`}
                onClick={() => handleSuggestionClick(s)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="suggestion-icon">{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span>{s.label}</span>
                  {s.subtitle && (
                    <span className="suggestion-subtitle">{s.subtitle}</span>
                  )}
                </div>
                <span className="suggestion-type">{s.type === 'history' ? 'History' : s.type === 'bookmark' ? 'Bookmark' : s.type === 'tab' ? 'Switch tab' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

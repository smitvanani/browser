import React, { useState, useRef, useEffect } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

const api = () => (window as any).browserAPI

function formatMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

const QUICK_ACTIONS = [
  { emoji: '\u{1F4DD}', label: 'Summarize this page', msg: 'summarize this page', color: 'rgba(102,126,234,0.1)' },
  { emoji: '\u{1F50D}', label: 'What is this page about?', msg: 'what is this page about?', color: 'rgba(107,207,127,0.1)' },
  { emoji: '\u{1F310}', label: 'Open YouTube', msg: 'open youtube', color: 'rgba(245,87,108,0.1)' },
  { emoji: '\u{1F4C2}', label: 'List my Downloads', msg: 'list files in my Downloads folder', color: 'rgba(253,160,133,0.1)' },
]

export default function AiPanel() {
  const { aiPanelVisible, toggleAiPanel, showToast } = useBrowser()

  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (aiPanelVisible && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
  }, [aiPanelVisible])

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || isStreaming) return

    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: Date.now() }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsStreaming(true)

    try {
      const b = api()
      const result = await b.aiChat(msg)
      if (result && result.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text, timestamp: Date.now() }])
        if (result.actions && result.actions.length > 0) {
          setMessages(prev => [...prev, { role: 'system', content: result.actions.join(' \u00b7 '), timestamp: Date.now() }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: String(result), timestamp: Date.now() }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'system', content: 'Error: ' + e.message, timestamp: Date.now() }])
    }
    setIsStreaming(false)
  }

  const handleClear = async () => {
    const b = api()
    if (b?.aiClearChat) await b.aiClearChat()
    setMessages([])
    showToast('\u21BB', 'Chat cleared')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className={'ai-panel' + (aiPanelVisible ? ' visible' : '')}>
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-header-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div className="ai-header-info">
            <h3>Nova AI</h3>
            <div className="ai-header-sub">
              <span className="ai-status-dot" />
              <span>powered by claude</span>
            </div>
          </div>
        </div>
        <div className="ai-header-actions">
          <button className="ai-header-btn" onClick={handleClear} title="New chat">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7a6 6 0 1011.2 3M12 1v4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="ai-header-btn" onClick={toggleAiPanel} title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <div className="ai-welcome-orb">
              <div className="ai-welcome-orb-inner">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#star-grad)" />
                  <defs><linearGradient id="star-grad" x1="2" y1="2" x2="22" y2="22"><stop stopColor="var(--accent,#667eea)"/><stop offset="1" stopColor="#764ba2"/></linearGradient></defs>
                </svg>
              </div>
              <div className="ai-welcome-ring" />
              <div className="ai-welcome-ring" style={{ animationDelay: '0.5s', width: '110px', height: '110px' }} />
            </div>
            <h4 className="ai-welcome-title">Nova AI</h4>
            <p className="ai-welcome-desc">Your intelligent browsing assistant. Ask anything or try a quick action below.</p>
            <div className="ai-quick-grid">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  className="ai-quick-card"
                  onClick={() => handleSend(action.msg)}
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <span className="ai-quick-emoji" style={{ background: action.color }}>{action.emoji}</span>
                  <span className="ai-quick-label">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-msg-avatar">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>
                  </div>
                )}
                <div className="ai-msg-bubble">
                  {msg.role === 'user' ? (
                    msg.content
                  ) : msg.role === 'system' ? (
                    msg.content
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                  )}
                </div>
                {msg.timestamp && msg.role !== 'system' && (
                  <span className="ai-msg-time">{formatTime(msg.timestamp)}</span>
                )}
              </div>
            ))}
          </>
        )}

        {isStreaming && (
          <div className="ai-msg assistant">
            <div className="ai-msg-avatar">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>
            </div>
            <div className="ai-typing">
              <div className="ai-typing-dot" />
              <div className="ai-typing-dot" />
              <div className="ai-typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input-area">
        <div className="ai-input-wrap">
          <textarea
            ref={textareaRef}
            className="ai-input"
            placeholder="Ask Nova AI anything..."
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <button
            className={'ai-send-btn' + (input.trim() ? ' active' : '')}
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 14V2M8 2L3 7M8 2l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="ai-input-hint">
          <span>Enter to send</span>
          <span>\u00b7</span>
          <span>Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  )
}

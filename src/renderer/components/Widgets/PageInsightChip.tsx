import React, { useState, useEffect, useRef, useCallback } from 'react'

interface PageInsightData {
  type: string
  url?: string
  title?: string
}

const PAGE_CONFIGS: Record<string, { icon: string; label: string; color: string; actions: { label: string; prompt: string }[] }> = {
  product: {
    icon: '\u{1F6D2}', label: 'Shopping', color: '#f59e0b',
    actions: [
      { label: 'Summarize', prompt: 'Summarize this product page: key features, price, and pros/cons in bullet points.' },
      { label: 'Find Issues', prompt: 'Based on this product page, what are potential concerns or red flags a buyer should know? Be concise.' },
      { label: 'Compare', prompt: 'What should I compare this product against? Suggest 2-3 alternatives and what to look for.' },
    ]
  },
  article: {
    icon: '\u{1F4F0}', label: 'Article', color: '#3b82f6',
    actions: [
      { label: 'TL;DR', prompt: 'Give me a 2-3 sentence TL;DR of this article.' },
      { label: 'Key Points', prompt: 'What are the 3-5 most important points in this article? One sentence each.' },
      { label: 'Takeaways', prompt: 'What are the actionable takeaways from this article? List them concisely.' },
    ]
  },
  video: {
    icon: '\u{1F3AC}', label: 'Video', color: '#ef4444',
    actions: [
      { label: 'About', prompt: 'Based on the page content, what is this video about? Summarize in 2-3 sentences.' },
      { label: 'Key Topics', prompt: 'What are the main topics/sections covered based on the video page description?' },
    ]
  },
  docs: {
    icon: '\u{1F4DA}', label: 'Docs', color: '#8b5cf6',
    actions: [
      { label: 'Quick Start', prompt: 'Extract the quick-start or getting-started steps from this documentation page. Be concise.' },
      { label: 'Key Concepts', prompt: 'What are the key concepts explained on this documentation page? List them with one-line explanations.' },
      { label: 'Examples', prompt: 'Extract or summarize any code examples or usage examples from this page.' },
    ]
  },
  code: {
    icon: '\u{1F4BB}', label: 'Code', color: '#10b981',
    actions: [
      { label: 'Explain', prompt: 'Explain what this code/repository does in simple terms. Be concise.' },
      { label: 'Structure', prompt: 'Describe the structure and key components of this code/project.' },
    ]
  },
  social: {
    icon: '\u{1F4AC}', label: 'Social', color: '#ec4899',
    actions: [
      { label: 'Summarize', prompt: 'Summarize the main discussion/thread on this social media page.' },
      { label: 'Sentiment', prompt: 'What is the overall sentiment and key opinions expressed on this page?' },
    ]
  },
  search: {
    icon: '\u{1F50D}', label: 'Search', color: '#6366f1',
    actions: [
      { label: 'Best Result', prompt: 'Based on these search results, which result is most relevant and why? Be very concise.' },
      { label: 'Summary', prompt: 'Summarize the top search results on this page in 3-4 bullet points.' },
    ]
  },
  webpage: {
    icon: '\u{1F310}', label: 'Page', color: '#667eea',
    actions: [
      { label: 'TL;DR', prompt: 'Summarize this webpage in 2-3 concise sentences.' },
      { label: 'Key Points', prompt: 'What are the 3 most important points on this page? One short sentence each.' },
      { label: 'Actions', prompt: 'What can a user DO on this page? List 2-3 possible actions in one short sentence each.' },
    ]
  },
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function formatMd(text: string): string {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre style="background:var(--sidebar-hover);padding:8px 10px;border-radius:8px;overflow-x:auto;margin:6px 0;font-size:11px"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--sidebar-hover);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\*\-] (.+)$/gm, '<div style="padding-left:12px;position:relative;margin:3px 0"><span style="position:absolute;left:0">&#x2022;</span>$1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;position:relative;margin:3px 0"><span style="position:absolute;left:0;color:var(--accent,#667eea);font-weight:600">$1.</span>$2</div>')
    .replace(/\n/g, '<br>')
}

export default function PageInsightChip() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [pageType, setPageType] = useState('webpage')
  const [pageUrl, setPageUrl] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState('')
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const api = (window as any).browserAPI
    if (!api) return

    api.onPageInsights((data: PageInsightData) => {
      setPageType(data.type || 'webpage')
      setPageUrl(data.url || '')
      setContentHtml('')
      setExpanded(false)
      setActiveAction('')
      setVisible(true)

      if (autoHideTimer.current) clearTimeout(autoHideTimer.current)
      autoHideTimer.current = setTimeout(() => {
        setExpanded(exp => { if (!exp) setVisible(false); return exp })
      }, 12000)
    })

    return () => { if (autoHideTimer.current) clearTimeout(autoHideTimer.current) }
  }, [])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setVisible(false)
    setExpanded(false)
  }, [])

  const handleAction = useCallback(async (label: string, prompt: string) => {
    const api = (window as any).browserAPI
    if (!api || loading) return

    setLoading(true)
    setExpanded(true)
    setActiveAction(label)
    setContentHtml('')

    if (autoHideTimer.current) clearTimeout(autoHideTimer.current)

    try {
      const result = await api.aiPageInsight('custom:' + prompt)
      if (result) {
        setContentHtml(formatMd(result))
      } else {
        setContentHtml('<span style="color:var(--text-hint)">Could not analyze this page.</span>')
      }
    } catch {
      setContentHtml('<span style="color:var(--text-hint)">Something went wrong.</span>')
    }
    setLoading(false)
  }, [loading])

  const config = PAGE_CONFIGS[pageType] || PAGE_CONFIGS.webpage
  const domain = getDomain(pageUrl)

  return (
    <div className={`page-chip${visible ? ' visible' : ''}${expanded ? ' expanded' : ''}`}>
      {/* Collapsed: just the chip */}
      <div className="page-chip-header" onClick={() => setExpanded(v => !v)}>
        <div className="page-chip-icon" style={{ background: config.color + '18', color: config.color }}>
          {config.icon}
        </div>
        <div className="page-chip-info">
          <span className="page-chip-label">{config.label}</span>
          {domain && <span className="page-chip-domain">{domain}</span>}
        </div>
        <div className="page-chip-actions-row">
          {config.actions.slice(0, 3).map((action, i) => (
            <button
              key={i}
              className={`page-chip-btn${activeAction === action.label ? ' active' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleAction(action.label, action.prompt) }}
              style={{ '--btn-color': config.color } as React.CSSProperties}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button className="page-chip-close" onClick={handleDismiss}>&times;</button>
      </div>

      {/* Expanded: AI response */}
      {expanded && (
        <div className="page-chip-body">
          {loading ? (
            <div className="page-chip-loading">
              <div className="page-chip-dots"><span /><span /><span /></div>
              <span>Analyzing page...</span>
            </div>
          ) : contentHtml ? (
            <div className="page-chip-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          ) : (
            <div className="page-chip-empty">Click an action above to analyze this page</div>
          )}
        </div>
      )}
    </div>
  )
}

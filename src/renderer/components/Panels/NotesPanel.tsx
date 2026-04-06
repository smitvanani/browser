import React, { useState, useEffect } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const api = () => (window as any).browserAPI

export default function NotesPanel() {
  const { notesPanelVisible, toggleNotesPanel, tabs, activeTabId, showToast } = useBrowser()

  const [note, setNote] = useState('')
  const [domain, setDomain] = useState('')

  const getDomain = (url: string): string => {
    try { return new URL(url).hostname } catch { return '' }
  }

  useEffect(() => {
    if (!notesPanelVisible) return
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || !tab.url || tab.url.startsWith('file://')) {
      setDomain('')
      setNote('')
      return
    }
    const d = getDomain(tab.url)
    setDomain(d)
    if (d) {
      const b = api()
      if (b?.getSiteNotes) {
        b.getSiteNotes(d).then((n: string) => setNote(n || ''))
      }
    }
  }, [notesPanelVisible, activeTabId, tabs])

  // Auto-save when panel closes
  const prevVisible = React.useRef(notesPanelVisible)
  useEffect(() => {
    if (prevVisible.current && !notesPanelVisible && domain && note !== undefined) {
      const b = api()
      if (b?.saveSiteNotes) b.saveSiteNotes(domain, note)
    }
    prevVisible.current = notesPanelVisible
  }, [notesPanelVisible])

  const handleSave = async () => {
    if (!domain) return
    const b = api()
    if (b?.saveSiteNotes) {
      await b.saveSiteNotes(domain, note)
    }
    toggleNotesPanel()
    showToast('\uD83D\uDCDD', 'Notes saved!')
  }

  return (
    <div className={'notes-panel' + (notesPanelVisible ? ' visible' : '')}>
      <div className="notes-panel-header">
        <div>
          <h3>Site Notes</h3>
          <div className="notes-panel-domain">{domain || 'No site loaded'}</div>
        </div>
        <button className="notes-panel-close" onClick={toggleNotesPanel}>&times;</button>
      </div>
      <textarea
        className="notes-textarea"
        placeholder="Add notes about this site..."
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <button className="notes-save-btn" onClick={handleSave}>Save Notes</button>
    </div>
  )
}

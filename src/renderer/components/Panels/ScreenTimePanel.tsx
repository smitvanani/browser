import React, { useState, useEffect } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const api = () => (window as any).browserAPI

interface ScreenTimeEntry {
  domain: string
  seconds: number
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function ScreenTimePanel() {
  const { screenTimePanelVisible, toggleScreenTimePanel } = useBrowser()

  const [entries, setEntries] = useState<ScreenTimeEntry[]>([])
  const [totalSeconds, setTotalSeconds] = useState(0)

  useEffect(() => {
    if (!screenTimePanelVisible) return
    const b = api()
    if (!b?.getScreenTime) return

    b.getScreenTime().then((data: Record<string, number>) => {
      const sorted = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .map(([domain, seconds]) => ({ domain, seconds }))
      setEntries(sorted)
      setTotalSeconds(sorted.reduce((acc, e) => acc + e.seconds, 0))
    })
  }, [screenTimePanelVisible])

  const maxTime = entries.length > 0 ? entries[0].seconds : 1

  return (
    <div className={'screentime-panel' + (screenTimePanelVisible ? ' visible' : '')}>
      <div className="st-header">
        <h3>Screen Time</h3>
        <button className="st-close" onClick={toggleScreenTimePanel}>&times;</button>
      </div>
      <div className="st-body">
        <div className="st-total">{formatTime(totalSeconds)}</div>
        <div className="st-total-label">total today</div>

        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-hint)', fontSize: '13px' }}>
            No data yet — start browsing!
          </div>
        ) : (
          entries.slice(0, 15).map(entry => (
            <div key={entry.domain} className="st-item">
              <img
                src={`https://www.google.com/s2/favicons?domain=${entry.domain}&sz=32`}
                alt=""
                style={{ width: 16, height: 16, borderRadius: 3 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="st-item-domain">{entry.domain}</span>
              <div className="st-item-bar">
                <div
                  className="st-item-bar-fill"
                  style={{
                    width: `${(entry.seconds / maxTime) * 100}%`,
                    background: 'var(--accent, #667eea)',
                  }}
                />
              </div>
              <span className="st-item-time">{formatTime(entry.seconds)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

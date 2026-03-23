import React, { useState, useEffect, useCallback } from 'react'
import { useBrowser } from '../../hooks/useBrowser'

interface PomodoroState {
  remaining: number
  mode: string
  running: boolean
}

const WORK_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const PomodoroWidget: React.FC = () => {
  const { pomodoroVisible } = useBrowser()
  const [remaining, setRemaining] = useState(WORK_DURATION)
  const [mode, setMode] = useState<string>('work')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const api = (window as any).browserAPI
    if (!api) return

    const cleanup = api.onPomodoroTick((data: PomodoroState) => {
      setRemaining(data.remaining)
      setMode(data.mode)
      setRunning(data.running)
    })

    // Get initial state
    api.pomodoroGet().then((state: PomodoroState) => {
      if (state) {
        setRemaining(state.remaining)
        setMode(state.mode)
        setRunning(state.running)
      }
    })

    return cleanup
  }, [])

  const handleStartPause = useCallback(async () => {
    const api = (window as any).browserAPI
    if (!api) return
    if (running) {
      await api.pomodoroPause()
    } else {
      await api.pomodoroStart()
    }
  }, [running])

  const handleReset = useCallback(async () => {
    const api = (window as any).browserAPI
    if (!api) return
    await api.pomodoroReset()
    setRemaining(WORK_DURATION)
    setMode('work')
    setRunning(false)
  }, [])

  const total = mode === 'work' ? WORK_DURATION : BREAK_DURATION
  const barPercent = (remaining / total) * 100
  const barColor = mode === 'work' ? 'var(--accent, #667eea)' : '#6bcf7f'

  return (
    <div className={`pomodoro-widget${pomodoroVisible ? ' visible' : ''}`}>
      <div className="pomodoro-header">
        <span className="pomodoro-label">POMODORO</span>
        <span className={`pomodoro-mode ${mode}`}>{mode.toUpperCase()}</span>
      </div>
      <div className="pomodoro-time">{formatTime(remaining)}</div>
      <div className="pomodoro-bar">
        <div
          className="pomodoro-bar-fill"
          style={{ width: `${barPercent}%`, background: barColor }}
        />
      </div>
      <div className="pomodoro-btns">
        <button className="pomodoro-btn primary" onClick={handleStartPause}>
          {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
        </button>
        <button className="pomodoro-btn secondary" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  )
}

export default PomodoroWidget

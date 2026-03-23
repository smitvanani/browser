import React from 'react'
import { useBrowser } from '../../hooks/useBrowser'

const Toast: React.FC = () => {
  const { toast } = useBrowser()

  return (
    <div className={`toast${toast ? ' visible' : ''}`}>
      <span className="toast-icon">{toast?.icon}</span>
      <span className="toast-text">{toast?.text}</span>
    </div>
  )
}

export default Toast

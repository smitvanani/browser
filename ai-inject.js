// Nova AI — Injected into every webpage
// Provides: AI popup (for right-click menu), Writing Assistant
(function() {
  if (window.__novaAIInjected) return
  window.__novaAIInjected = true

  // ═══ STYLES ═══
  const style = document.createElement('style')
  style.textContent = `
    @keyframes novaBarIn { from{opacity:0;transform:translateY(6px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes novaPopIn { from{opacity:0;transform:translateY(8px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes novaDot { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }

    #nova-ai-bar {
      position:fixed; z-index:2147483647; display:none;
      background:#1a1a2e; border-radius:12px; padding:4px;
      box-shadow:0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08);
      backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
      animation:novaBarIn 0.2s cubic-bezier(0.16,1,0.3,1);
      flex-direction:row; gap:2px; align-items:center;
      font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;
      user-select:none; -webkit-user-select:none;
    }
    #nova-ai-bar.visible { display:flex; }
    .nova-ai-btn {
      display:flex; align-items:center; gap:6px; padding:7px 12px;
      background:transparent; border:none; color:#c8c8e0; font-size:12px;
      font-weight:500; cursor:pointer; border-radius:9px; white-space:nowrap;
      transition:all 0.15s ease; font-family:inherit;
    }
    .nova-ai-btn:hover { background:rgba(255,255,255,0.1); color:#fff; }
    .nova-ai-btn:active { transform:scale(0.95); }
    .nova-ai-btn .nova-icon { font-size:13px; flex-shrink:0; }
    .nova-ai-divider { width:1px; height:20px; background:rgba(255,255,255,0.1); flex-shrink:0; }

    #nova-ai-ask-bar {
      position:fixed; z-index:2147483647; display:none;
      background:#1a1a2e; border-radius:14px;
      box-shadow:0 12px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
      backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
      width:380px; padding:4px;
      animation:novaBarIn 0.2s cubic-bezier(0.16,1,0.3,1);
      font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;
    }
    #nova-ai-ask-bar.visible { display:flex; }
    #nova-ai-ask-input {
      flex:1; background:transparent; border:none; color:#e0e0f0; font-size:13px;
      padding:10px 14px; outline:none; font-family:inherit; font-weight:400;
    }
    #nova-ai-ask-input::placeholder { color:#555578; }
    #nova-ai-ask-send {
      background:linear-gradient(135deg,#667eea,#764ba2); border:none; color:#fff;
      width:32px; height:32px; border-radius:10px; cursor:pointer; display:flex;
      align-items:center; justify-content:center; flex-shrink:0; transition:filter 0.2s;
    }
    #nova-ai-ask-send:hover { filter:brightness(1.15); }

    #nova-ai-popup {
      position:fixed; z-index:2147483647; display:none;
      background:#1a1a2e; border-radius:16px; padding:0;
      box-shadow:0 12px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
      backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
      max-width:420px; min-width:280px; max-height:360px;
      animation:novaPopIn 0.25s cubic-bezier(0.16,1,0.3,1);
      font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;
      overflow:hidden;
    }
    #nova-ai-popup.visible { display:block; }
    .nova-popup-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06);
    }
    .nova-popup-title {
      font-size:11px; font-weight:600; color:#8b8bb0; text-transform:uppercase;
      letter-spacing:1px; display:flex; align-items:center; gap:6px;
    }
    .nova-popup-close {
      background:none; border:none; color:#666; cursor:pointer; font-size:16px;
      padding:2px 6px; border-radius:6px; line-height:1;
    }
    .nova-popup-close:hover { color:#fff; background:rgba(255,255,255,0.1); }
    .nova-popup-body {
      padding:14px 16px; color:#d4d4e8; font-size:13px; line-height:1.65;
      max-height:280px; overflow-y:auto; font-weight:400;
    }
    .nova-popup-body strong { color:#fff; font-weight:600; }
    .nova-popup-body code { background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:4px; font-size:12px; font-family:'SF Mono',monospace; }
    .nova-popup-body pre { background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; overflow-x:auto; margin:8px 0; }
    .nova-popup-body pre code { background:none; padding:0; }
    .nova-popup-body ul, .nova-popup-body ol { padding-left:18px; margin:6px 0; }
    .nova-popup-body li { margin:3px 0; }
    .nova-popup-body a { color:#667eea; text-decoration:none; }
    .nova-popup-body a:hover { text-decoration:underline; }
    .nova-popup-loading {
      display:flex; align-items:center; gap:8px; padding:20px 16px; color:#8b8bb0; font-size:12px;
    }
    .nova-popup-dots { display:flex; gap:4px; }
    .nova-popup-dots span {
      width:6px; height:6px; border-radius:50%; background:#667eea;
      animation:novaDot 1.2s ease infinite;
    }
    .nova-popup-dots span:nth-child(2) { animation-delay:0.15s; }
    .nova-popup-dots span:nth-child(3) { animation-delay:0.3s; }
    .nova-popup-body::-webkit-scrollbar { width:4px; }
    .nova-popup-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }

    /* Writing Assistant */
    #nova-write-btn {
      position:fixed; z-index:2147483646; display:none;
      width:28px; height:28px; border-radius:9px;
      background:linear-gradient(135deg,#667eea,#764ba2);
      border:none; cursor:pointer; color:#fff;
      box-shadow:0 4px 16px rgba(102,126,234,0.35);
      align-items:center; justify-content:center;
      transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
      font-size:13px; line-height:1;
      animation:novaBarIn 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    #nova-write-btn.visible { display:flex; }
    #nova-write-btn:hover { transform:scale(1.1); box-shadow:0 6px 20px rgba(102,126,234,0.45); }
    #nova-write-btn:active { transform:scale(0.95); }
    #nova-write-btn.loading { opacity:0.6; pointer-events:none; }
    #nova-write-menu {
      position:fixed; z-index:2147483647; display:none;
      background:#1a1a2e; border-radius:12px; padding:4px;
      box-shadow:0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08);
      backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
      animation:novaBarIn 0.2s cubic-bezier(0.16,1,0.3,1);
      font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;
      min-width:170px;
    }
    #nova-write-menu.visible { display:block; }
    .nova-write-option {
      display:flex; align-items:center; gap:8px; padding:8px 12px;
      background:none; border:none; color:#c8c8e0; font-size:12px;
      font-weight:500; cursor:pointer; border-radius:8px; width:100%;
      transition:all 0.15s; font-family:inherit; text-align:left;
    }
    .nova-write-option:hover { background:rgba(255,255,255,0.1); color:#fff; }
    .nova-write-option:active { transform:scale(0.97); }
    .nova-write-option .wr-icon { font-size:13px; width:18px; text-align:center; flex-shrink:0; }
  `
  document.head.appendChild(style)

  // ═══ FLOATING TOOLBAR + POPUP ═══
  const bar = document.createElement('div')
  bar.id = 'nova-ai-bar'
  bar.innerHTML = `
    <button class="nova-ai-btn" data-action="explain"><span class="nova-icon">&#x2728;</span>Explain</button>
    <div class="nova-ai-divider"></div>
    <button class="nova-ai-btn" data-action="translate"><span class="nova-icon">&#x1F310;</span>Translate</button>
    <div class="nova-ai-divider"></div>
    <button class="nova-ai-btn" data-action="summarize"><span class="nova-icon">&#x1F4DD;</span>Summarize</button>
    <div class="nova-ai-divider"></div>
    <button class="nova-ai-btn" data-action="ask"><span class="nova-icon">&#x1F4AC;</span>Ask</button>
  `
  document.body.appendChild(bar)

  const popup = document.createElement('div')
  popup.id = 'nova-ai-popup'
  document.body.appendChild(popup)

  const askBar = document.createElement('div')
  askBar.id = 'nova-ai-ask-bar'
  askBar.innerHTML = `
    <input id="nova-ai-ask-input" type="text" placeholder="Ask about this text..." autocomplete="off" spellcheck="false">
    <button id="nova-ai-ask-send">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 14V2M8 2L3 7M8 2l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `
  document.body.appendChild(askBar)

  let selectedText = ''
  let barTimeout = null

  function formatMd(text) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n/g, '<br>')
  }

  function setPopupContent(html) {
    const body = popup.querySelector('.nova-popup-loading')
    if (body) {
      const div = document.createElement('div')
      div.className = 'nova-popup-body'
      div.innerHTML = html
      body.replaceWith(div)
    }
  }

  function hideAll() {
    bar.classList.remove('visible')
    popup.classList.remove('visible')
    askBar.classList.remove('visible')
  }

  function showPopup(title, x, y) {
    popup.innerHTML = `
      <div class="nova-popup-header">
        <div class="nova-popup-title">&#x2728; ${title}</div>
        <button class="nova-popup-close" onclick="document.getElementById('nova-ai-popup').classList.remove('visible')">&times;</button>
      </div>
      <div class="nova-popup-loading">
        <div class="nova-popup-dots"><span></span><span></span><span></span></div>
        <span>Nova is thinking...</span>
      </div>
    `
    let px = x, py = y + 50
    if (px + 420 > window.innerWidth) px = window.innerWidth - 428
    if (py + 360 > window.innerHeight) py = y - 370
    if (px < 8) px = 8
    if (py < 8) py = 8
    popup.style.left = px + 'px'
    popup.style.top = py + 'px'
    popup.classList.add('visible')
    bar.classList.remove('visible')
  }

  // ═══ SELECTION HANDLER ═══
  document.addEventListener('mouseup', (e) => {
    if (e.target.closest('#nova-ai-bar') || e.target.closest('#nova-ai-popup') || e.target.closest('#nova-ai-ask-bar')) return
    clearTimeout(barTimeout)
    barTimeout = setTimeout(() => {
      const sel = window.getSelection()
      const text = sel ? sel.toString().trim() : ''
      if (text.length > 3 && text.length < 10000) {
        selectedText = text
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        let x = rect.left + rect.width / 2 - 150
        let y = rect.top - 48
        if (x < 8) x = 8
        if (x + 300 > window.innerWidth) x = window.innerWidth - 308
        if (y < 8) y = rect.bottom + 8
        bar.style.left = x + 'px'
        bar.style.top = y + 'px'
        bar.classList.add('visible')
      } else { hideAll() }
    }, 300)
  })

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('#nova-ai-bar') || e.target.closest('#nova-ai-popup') || e.target.closest('#nova-ai-ask-bar') || e.target.closest('#nova-write-btn') || e.target.closest('#nova-write-menu')) return
    hideAll()
  })
  document.addEventListener('scroll', () => { hideAll() }, true)

  // ═══ TOOLBAR ACTIONS ═══
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.nova-ai-btn')
    if (!btn || !selectedText) return
    const action = btn.dataset.action
    const barRect = bar.getBoundingClientRect()

    if (action === 'ask') {
      askBar.style.left = barRect.left + 'px'
      askBar.style.top = barRect.top + 'px'
      askBar.classList.add('visible')
      bar.classList.remove('visible')
      const input = document.getElementById('nova-ai-ask-input')
      input.value = ''
      setTimeout(() => input.focus(), 100)
      return
    }

    let prompt = '', title = ''
    if (action === 'explain') { title = 'Explain'; prompt = `Explain this in simple, clear terms. Be concise (3-4 sentences max):\n\n"${selectedText.substring(0, 3000)}"` }
    else if (action === 'translate') { title = 'Translate'; prompt = `Translate to English. If already English, translate to Spanish. Just the translation:\n\n"${selectedText.substring(0, 3000)}"` }
    else if (action === 'summarize') { title = 'Summary'; prompt = `Summarize in 2-3 concise bullet points:\n\n"${selectedText.substring(0, 5000)}"` }

    showPopup(title, barRect.left, barRect.top)
    console.log('__NOVA_AI__' + JSON.stringify({ prompt, selectedText: selectedText.substring(0, 3000) }))
  })

  // Ask bar
  document.getElementById('nova-ai-ask-send').addEventListener('click', () => sendAsk())
  document.getElementById('nova-ai-ask-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAsk()
    if (e.key === 'Escape') askBar.classList.remove('visible')
  })
  function sendAsk() {
    const input = document.getElementById('nova-ai-ask-input')
    const question = input.value.trim()
    if (!question) return
    const rect = askBar.getBoundingClientRect()
    askBar.classList.remove('visible')
    showPopup('Answer', rect.left, rect.top)
    const prompt = `Answer this question about the following text. Be concise.\n\nQuestion: ${question}\n\nText: "${selectedText.substring(0, 3000)}"`
    console.log('__NOVA_AI__' + JSON.stringify({ prompt, selectedText: selectedText.substring(0, 3000) }))
  }

  // ═══ RECEIVE AI RESPONSES ═══
  let activeWriteField = null

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'nova-ai-response') {
      setPopupContent(formatMd(e.data.text))
    }
    if (e.data && e.data.type === 'nova-ai-error') {
      setPopupContent('<span style="color:#f5576c">' + e.data.text + '</span>')
    }
    if (e.data && e.data.type === 'nova-ai-write-response') {
      if (activeWriteField && e.data.text) {
        const clean = e.data.text.replace(/^["']|["']$/g, '').trim()
        activeWriteField.value = clean
        activeWriteField.dispatchEvent(new Event('input', { bubbles: true }))
        activeWriteField.focus()
        const wb = document.getElementById('nova-write-btn')
        if (wb) wb.classList.remove('loading')
        const wm = document.getElementById('nova-write-menu')
        if (wm) wm.classList.remove('visible')
      }
    }
  })

  // ═══ WRITING ASSISTANT ═══
  let writeTimeout = null

  const writeBtn = document.createElement('button')
  writeBtn.id = 'nova-write-btn'
  writeBtn.innerHTML = '\u2728'
  writeBtn.title = 'Nova AI Writing'
  document.body.appendChild(writeBtn)

  const writeMenu = document.createElement('div')
  writeMenu.id = 'nova-write-menu'
  writeMenu.innerHTML = `
    <button class="nova-write-option" data-action="fix"><span class="wr-icon">\u2705</span>Fix Grammar</button>
    <button class="nova-write-option" data-action="shorter"><span class="wr-icon">\u2702\uFE0F</span>Make Shorter</button>
    <button class="nova-write-option" data-action="professional"><span class="wr-icon">\u{1F454}</span>Professional</button>
    <button class="nova-write-option" data-action="casual"><span class="wr-icon">\u{1F60A}</span>Casual</button>
    <button class="nova-write-option" data-action="translate"><span class="wr-icon">\u{1F310}</span>Translate</button>
  `
  document.body.appendChild(writeMenu)

  function checkWriteField(el) {
    if (!el || !el.value || el.value.trim().length < 15) {
      writeBtn.classList.remove('visible')
      return
    }
    activeWriteField = el
    const rect = el.getBoundingClientRect()
    let bx = rect.right - 34
    let by = rect.top + 4
    if (bx + 28 > window.innerWidth) bx = window.innerWidth - 36
    if (by < 4) by = 4
    writeBtn.style.left = bx + 'px'
    writeBtn.style.top = by + 'px'
    writeBtn.classList.add('visible')
  }

  document.addEventListener('input', (e) => {
    const el = e.target
    if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'email' || !el.type))) {
      clearTimeout(writeTimeout)
      writeTimeout = setTimeout(() => checkWriteField(el), 800)
    }
  }, true)

  document.addEventListener('focusout', (e) => {
    setTimeout(() => {
      if (!writeBtn.matches(':hover') && !writeMenu.matches(':hover')) {
        writeBtn.classList.remove('visible')
        writeMenu.classList.remove('visible')
      }
    }, 200)
  }, true)

  writeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const rect = writeBtn.getBoundingClientRect()
    let mx = rect.left - 140
    if (mx < 8) mx = 8
    writeMenu.style.left = mx + 'px'
    writeMenu.style.top = (rect.bottom + 6) + 'px'
    writeMenu.classList.toggle('visible')
  })

  writeMenu.addEventListener('click', (e) => {
    const opt = e.target.closest('.nova-write-option')
    if (!opt || !activeWriteField) return
    const action = opt.dataset.action
    const text = activeWriteField.value.trim()
    if (!text) return

    let prompt = ''
    if (action === 'fix') prompt = `Fix grammar and spelling. Return ONLY the corrected text, nothing else:\n\n"${text}"`
    else if (action === 'shorter') prompt = `Make this shorter while keeping the meaning. Return ONLY the shortened text:\n\n"${text}"`
    else if (action === 'professional') prompt = `Rewrite in a professional tone. Return ONLY the rewritten text:\n\n"${text}"`
    else if (action === 'casual') prompt = `Rewrite in a friendly casual tone. Return ONLY the rewritten text:\n\n"${text}"`
    else if (action === 'translate') prompt = `Translate to English. If already English, translate to Hindi. Return ONLY the translation:\n\n"${text}"`

    writeBtn.classList.add('loading')
    console.log('__NOVA_WRITE__' + JSON.stringify({ prompt }))
  })

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#nova-write-btn') && !e.target.closest('#nova-write-menu')) {
      writeMenu.classList.remove('visible')
    }
  })
})()

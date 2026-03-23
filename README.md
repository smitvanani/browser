# Nova Browser

A modern, AI-powered browser built with Electron, React, and TypeScript. Designed with a premium UI/UX that rivals Arc, Zen, and Safari.

![Nova Browser](https://img.shields.io/badge/version-1.0.0-764ba2?style=flat-square) ![Electron](https://img.shields.io/badge/Electron-41+-667eea?style=flat-square) ![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square)

---

## Features

### Core Browser
| Feature | Description |
|---------|-------------|
| **Vertical Sidebar Tabs** | Arc-style sidebar with tabs, favicons, and active indicators |
| **Spaces** | Organize tabs into color-coded workspaces (Personal, Work, Research) |
| **Collapsible Sidebar** | Smooth collapse to favicon-only mode with animated transitions |
| **Command Palette** | `Cmd+K` — search tabs, bookmarks, and run actions instantly |
| **URL Bar Overlay** | `Cmd+L` — search or navigate with Google suggestions |
| **Split View** | `Cmd+\` — view two pages side by side |
| **Focus Mode** | `Cmd+Shift+F` — hide sidebar for distraction-free browsing |
| **Find in Page** | `Cmd+F` — search text within any page |
| **Bookmarks** | Save, search, and manage bookmarks with one-click import |
| **PDF Viewer** | Inline PDF rendering using Chromium's built-in viewer |
| **Screenshots** | `Cmd+Shift+S` — capture any page |

### Nova AI (powered by Claude)
| Feature | Description |
|---------|-------------|
| **AI Chat Panel** | Built-in AI assistant — open with `Cmd+J` |
| **Browser Control** | "Open YouTube", "Close this tab", "Go back" — AI controls the browser |
| **Page Understanding** | "Summarize this page", "What is this page about?" |
| **File System Access** | "List my Downloads", "Read this file", "Save to Desktop" |
| **Web Search** | "Search for best laptops 2025" — AI searches and navigates |
| **Smart Memory** | AI remembers things you tell it across sessions |
| **Clipboard Access** | "Copy this URL", "What's in my clipboard?" |
| **System Commands** | Run terminal commands, get system info, send notifications |
| **Quick Actions** | Pre-built action cards in the welcome state |

### Privacy & Security
| Feature | Description |
|---------|-------------|
| **Ad & Tracker Blocker** | Built-in blocker for ads, trackers, and malware |
| **Blocked Counter** | Shows total trackers blocked in the sidebar |
| **Per-Site Tracking** | See how many trackers each site tries to load |

### Productivity
| Feature | Description |
|---------|-------------|
| **Pomodoro Timer** | Built-in focus timer with work/break modes |
| **Screen Time** | Track browsing time per domain with bar chart |
| **Site Notes** | Write and save notes for any website |
| **Reading Mode** | Clean, distraction-free reading experience |
| **Picture-in-Picture** | Float videos while browsing other tabs |
| **Custom CSS** | Inject your own CSS into any website |

### Customization
| Feature | Description |
|---------|-------------|
| **Accent Colors** | 12 accent colors that flow through the entire UI |
| **Dark/Light Mode** | Beautiful themes for both modes |
| **Quick Links** | Customizable shortcuts on the new tab page |
| **Search Engine** | Choose between Google, DuckDuckGo, Bing, or Brave |
| **Personalized Greeting** | New tab greets you by name with time-appropriate messages |

---

## Architecture

```
nova-browser/
├── index.js                 # Electron main process
├── preload.js               # IPC bridge (contextBridge)
├── newtab.html              # New tab page
├── onboarding.html          # 8-step premium onboarding
├── package.json             # Dependencies & scripts
├── vite.config.ts           # Vite build config
├── tsconfig.json            # TypeScript config
│
├── src/renderer/            # React UI (sidebar, panels, overlays)
│   ├── App.tsx              # Root component
│   ├── main.tsx             # React entry point
│   ├── types.ts             # TypeScript interfaces
│   │
│   ├── hooks/
│   │   └── useBrowser.tsx   # Central state provider (BrowserContext)
│   │
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx       # Main sidebar container
│   │   │   ├── DragRegion.tsx    # Nav buttons (back/forward/reload/collapse)
│   │   │   ├── SpacesBar.tsx     # Space dots + add button
│   │   │   ├── TabList.tsx       # Tab container
│   │   │   ├── TabItem.tsx       # Individual tab
│   │   │   ├── NewTabButton.tsx  # "+ New Tab" button
│   │   │   └── SidebarActions.tsx # Nova AI, Settings, dark mode toggle
│   │   │
│   │   ├── Navigation/
│   │   │   ├── FindBar.tsx       # Find in page
│   │   │   └── UrlBar.tsx        # URL bar with suggestions
│   │   │
│   │   ├── CommandPalette/
│   │   │   └── CommandPalette.tsx # Cmd+K command palette
│   │   │
│   │   ├── Panels/
│   │   │   ├── SettingsPanel.tsx  # Card-based settings UI
│   │   │   ├── AiPanel.tsx       # Nova AI chat panel
│   │   │   ├── NotesPanel.tsx    # Site notes panel
│   │   │   └── ScreenTimePanel.tsx # Screen time panel
│   │   │
│   │   ├── Widgets/
│   │   │   ├── PomodoroWidget.tsx  # Pomodoro timer
│   │   │   ├── PageInsightChip.tsx # AI page type chip
│   │   │   └── BookmarksDropdown.tsx # Bookmarks dropdown
│   │   │
│   │   ├── Overlays/
│   │   │   ├── LoadingBar.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ZoomIndicator.tsx
│   │   │   ├── ScreenshotFlash.tsx
│   │   │   ├── SplitDivider.tsx
│   │   │   └── DownloadIndicator.tsx
│   │   │
│   │   └── ContextMenu/
│   │       └── ContextMenu.tsx
│   │
│   └── styles/
│       └── global.css        # All CSS with variables, animations
│
└── dist/renderer/            # Vite build output (loaded by Electron)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Electron 41+ |
| **UI Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 8 |
| **AI** | Anthropic Claude API (@anthropic-ai/sdk) |
| **Styling** | CSS with custom properties, animations, glassmorphism |
| **Fonts** | Inter, Space Grotesk |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- [Anthropic API key](https://console.anthropic.com/settings/keys) (for Nova AI features)

### Install
```bash
git clone https://github.com/smitvanani/browser.git
cd browser
npm install
```

### Set up environment
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Run in Development
```bash
npm run build:renderer   # Build the React UI
npm start                # Start the Electron app
```

Or use the dev script with hot reload:
```bash
npm run dev
```

### Build for Production
```bash
# macOS
npm run build

# Windows
npm run build:win

# Linux
npm run build:linux
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+T` | New Tab |
| `Cmd+W` | Close Tab |
| `Cmd+L` | Open URL Bar |
| `Cmd+K` | Command Palette |
| `Cmd+F` | Find in Page |
| `Cmd+J` | Toggle Nova AI |
| `Cmd+,` | Settings |
| `Cmd+\` | Split View |
| `Cmd+Shift+F` | Focus Mode |
| `Cmd+Shift+S` | Screenshot |
| `Cmd+R` | Reload |
| `Cmd+[` | Go Back |
| `Cmd+]` | Go Forward |
| `Cmd++` | Zoom In |
| `Cmd+-` | Zoom Out |
| `Cmd+0` | Reset Zoom |

---

## Nova AI — What You Can Say

### Browser Control
```
"Open YouTube"
"Open github.com in a new tab"
"Close this tab"
"Go back"
"Search for React tutorials"
```

### Page Understanding
```
"Summarize this page"
"What is this page about?"
"Explain the main points"
```

### File System
```
"List files on my Desktop"
"Read ~/Documents/notes.txt"
"What PDFs are in my Downloads?"
"Save this to a file on my Desktop"
```

### Productivity
```
"Remember that my meeting is at 3pm"
"What did I ask you to remember?"
"Copy this URL to clipboard"
"Take a screenshot"
```

### System
```
"What's my battery level?"
"Run git status in ~/Projects/myapp"
"Send a notification saying 'Time to take a break'"
```

---

## Onboarding

Nova includes a premium 8-step onboarding experience:

1. **Welcome** — Cinematic logo reveal with orbiting dots
2. **Your Name** — Live preview of new tab greeting
3. **Pick Your Vibe** — Accent color with live mini-browser preview
4. **Search Engine** — Choose your default search
5. **Import** — One-click import from Chrome, Firefox, Safari, Edge
6. **Quick Links** — Pick your top 6 favorite sites
7. **Meet Nova AI** — Interactive AI demo that greets you by name
8. **Ready** — Confetti + personalized summary

### Reset Onboarding
```bash
npm run reset
```

---

## Settings

Access via `Cmd+,` or click **Settings** in the sidebar.

### Sections
- **Profile** — Name, search engine
- **Appearance** — Dark mode, accent color (12 options)
- **Quick Links** — Add/remove new tab shortcuts
- **Privacy & Security** — Ad & tracker blocker toggle
- **Advanced** — Custom CSS injection
- **Import Bookmarks** — Chrome, Firefox, Safari, Edge
- **About** — Version info

---

## Design Philosophy

Nova is built with these principles:

1. **Premium feel** — Glassmorphism, backdrop blur, smooth cubic-bezier animations
2. **Pixel-perfect** — Consistent spacing, typography, and color harmony
3. **60fps transitions** — Every interaction is buttery smooth
4. **Contextual UI** — Elements appear only when needed
5. **Dark mode first** — Both themes look equally stunning
6. **Keyboard-first** — Every feature accessible via shortcuts

---

## Project History

| Phase | What was done |
|-------|--------------|
| **Phase 1** | Core Electron browser with sidebar, tabs, spaces, AI, ad blocker, all features |
| **React Migration** | Migrated from vanilla HTML/JS to React + TypeScript + Vite (25+ components) |
| **UI/UX Overhaul** | Premium sidebar, card-based settings, polished AI panel, micro-animations |
| **Onboarding** | 8-step premium onboarding with animations and live previews |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

**Smit Vanani** — [@smitvanani](https://github.com/smitvanani)

Built with Electron, React, and Claude AI.

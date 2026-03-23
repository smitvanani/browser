# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nova is an Electron-based browser with AI integration (Claude API), React+TypeScript sidebar UI, vertical tabs, spaces, and a full feature set including ad blocking, screen time, notes, and more.

## Commands

- **Install dependencies:** `npm install`
- **Build renderer:** `npm run build:renderer`
- **Start the app:** `npm start`
- **Dev mode (hot reload):** `npm run dev`
- **Build for macOS:** `npm run build`
- **Build for Windows:** `npm run build:win`
- **Reset onboarding:** `npm run reset`

## Architecture

- **Entry point:** `index.js` — Electron main process (~1700 lines, handles windows, IPC, AI, ad blocking, session restore)
- **Preload:** `preload.js` — contextBridge IPC bindings
- **Renderer:** `src/renderer/` — React 19 + TypeScript (25+ components)
- **Build tool:** Vite 8 (`vite.config.ts`)
- **AI:** Claude API via `@anthropic-ai/sdk` — requires `ANTHROPIC_API_KEY` env var

## Environment Setup

Copy `.env.example` to `.env` and add your Anthropic API key.

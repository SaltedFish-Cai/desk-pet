# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A macOS desktop pet application using Tauri v2 + Vue 3 + Pixi.js. The app renders a small animated pet character that lives on the desktop, with interactive behaviors and idle animations.

## Prerequisites

- **Node.js** >= 18 (pnpm as package manager)
- **Rust toolchain** (via rustup) — required for `pnpm tauri dev` / `pnpm tauri build`
- **macOS** — target platform

## Commands

```bash
pnpm install            # Install JS dependencies
pnpm dev                # Vite dev server (http://localhost:1420)
pnpm build              # Build frontend (vue-tsc check + vite build)
pnpm typecheck          # vue-tsc --noEmit
pnpm tauri dev          # Launch Tauri dev window (frontend + Rust)
pnpm tauri build        # Production build for macOS (.dmg)
```

## Project Structure

```
desk-pet/
├── index.html                  # Vite SPA entry
├── package.json                # JS deps & scripts
├── vite.config.ts              # Vite + Vue plugin, dev server on :1420
├── tsconfig.json               # TypeScript strict mode, @/ path alias
├── .gitignore
├── src/
│   ├── main.ts                 # Vue app bootstrap
│   ├── App.vue                 # Root component (PetCanvas + UI overlays)
│   ├── vite-env.d.ts           # TS env declarations
│   ├── styles/
│   │   └── main.css            # Global styles (transparent bg, full viewport)
│   ├── pixi/
│   │   ├── index.ts            # Pixi Application factory & lifecycle
│   │   └── pet/
│   │       ├── Pet.ts          # Pet entity: Graphics-based body, animation states
│   │       └── index.ts        # Re-exports
│   ├── composables/
│   │   ├── usePetState.ts      # Reactive pet state (position, animation, mood, energy)
│   │   └── useSettings.ts      # App settings (auto-walk, sleep, volume)
│   └── components/
│       └── PetCanvas.vue       # Mounts/unmounts Pixi.js canvas
├── src-tauri/
│   ├── Cargo.toml              # Rust deps: tauri, tauri-plugin-store, serde
│   ├── build.rs                # tauri-build
│   ├── tauri.conf.json         # Window config (transparent, frameless, always-on-top)
│   ├── capabilities/
│   │   └── default.json        # Tauri v2 permissions (core:default, store:default)
│   └── src/
│       ├── main.rs             # Rust entry point
│       └── lib.rs              # Tauri builder, commands, plugin registration
```

## Architecture

- **Tauri Rust backend** (`src-tauri/`): Window lifecycle, transparent/frameless configuration, Tauri store plugin for persisting settings, IPC commands for pet position.
- **Vue 3 frontend** (`src/`): App shell — `App.vue` hosts `PetCanvas` + UI overlays. Composables manage reactive pet state and settings.
- **Pixi.js renderer** (`src/pixi/`): `Application` renders on a transparent canvas. `Pet` (extends `Container`) uses `Graphics` for the body and eyes, with a simple animation state machine (`idle` / `sleep` / `walk` / `interact` / `drag`) driven by `app.ticker`.

## Pet Animation System

- State machine: `idle` → `walk` → `sleep` → `interact` → `drag`
- Currently uses procedurally-drawn Graphics shapes (no sprite sheets yet)
- `Pet.update(dt)` is called every frame — each state produces different motion
- Transitions triggered by timers, mouse events, or composable state changes

## Window Configuration (`src-tauri/tauri.conf.json`)

- Transparent, frameless, always-on-top, skip-taskbar, non-resizable
- No CSP restrictions (required for Pixi.js WebGL on local files)
- Dev server at `http://localhost:1420`, production builds from `../dist`

## Important Notes

- Pixi.js v7 is used (constructor options, not `init()` API from v8)
- All user-facing strings should be in Chinese (target audience)
- Use `@/` path alias for `src/` imports in TypeScript/Vue
- Frontend builds standalone — `pnpm build` only requires Node.js; `pnpm tauri build` requires Rust
- The `dist/` directory is gitignored (build artifact)
- Rust `target/` is gitignored

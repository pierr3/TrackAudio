# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrackAudio is a cross-platform (macOS, Linux, Windows) Audio-For-VATSIM ATC client built as an Electron app with a C++ native backend. It connects to the VATSIM voice network, allowing air traffic controllers to transmit/receive on radio frequencies.

## Build Commands

### Initial Setup (one-time)
```bash
git submodule update --init --recursive backend/vcpkg
git submodule update --init --recursive backend/extern/afv-native
git submodule update --init --recursive backend/extern/libuiohook
npm run build:backend    # Compile C++ native module
npm install              # Install all dependencies (includes the built native module)
```

### Development
```bash
npm run dev              # Start Electron with hot-reload via electron-vite
```

### Rebuild After C++ Changes
```bash
npm run build:backend    # Recompile native module
npm install              # Re-install updated .tgz package
npm run dev
```

### Code Quality
```bash
npm run lint             # ESLint with auto-fix
npm run format           # Prettier formatting
npm run typecheck        # TypeScript checking (both node and web targets)
npm run typecheck:node   # TypeScript check for main/preload only
npm run typecheck:web    # TypeScript check for renderer only
```

### Production Build
```bash
npm run build            # typecheck + electron-vite build
npm run build:win        # Package for Windows
npm run build:mac        # Package for macOS
npm run build:linux      # Package for Linux
```

There is no test suite configured.

## Architecture

### Layer Diagram
```
React UI (src/renderer/src/)
    ↕ IPC via context bridge
Electron Main Process (src/main/index.ts)
    ↕ Direct N-API calls + callback registration
C++ Native Module (backend/src/)
    ↕ afv-native SDK
VATSIM Voice Network
```

### Frontend (src/renderer/src/)
- **React 18 + TypeScript** with Vite bundling
- **Zustand** for state management with 4 stores:
  - `radioStore` — radio frequencies, rx/tx/xc state, PTT status
  - `sessionStore` — connection state, callsign, network status
  - `utilStore` — VU meter, platform info, PTT key names, UI mode flags
  - `errorStore` — error messages and dialog state
- **Bootstrap 5 + SCSS** for styling
- Path alias: `@renderer/*` → `src/renderer/src/*`

### Electron Main Process (src/main/index.ts)
- Window management with mini-mode (Ctrl/Cmd+M) and always-on-top
- IPC handlers bridging renderer requests to native module calls
- Event queue system: buffers native events until renderer signals ready via `settings-ready`
- Configuration persistence via `electron-store`
- Auto-update system via `electron-updater`

### Preload / IPC Bridge (src/preload/bindings.ts)
- Exposes `window.api` object to renderer via Electron contextBridge
- Two communication patterns:
  - **Invoke** (request/response): renderer calls `window.api.someMethod()` → `ipcRenderer.invoke` → `ipcMain.handle` → native function → returns result
  - **Events** (push from native): C++ calls registered callback → main process broadcasts via `webContents.send` → renderer listens via `window.api.on()`

### C++ Backend (backend/)
- **Node-API (N-API v7)** native addon compiled with cmake-js
- **backend/src/main.cpp** — N-API function exports and entry point
- **backend/include/atcClientWrapper.h** — Wrapper around afv-native SDK client
- **backend/src/sdk.cpp** — WebSocket/HTTP server (RestinIO) exposing radio state to external clients (e.g., Stream Deck plugins)
- **backend/src/InputHandler.cpp** — PTT key detection via libuiohook + joystick support
- **backend/src/RemoteData.cpp** — Fetches station/frequency data from VATSIM
- Dependencies managed via vcpkg (backend/vcpkg.json)
- Key external submodules: `afv-native` (VATSIM voice SDK), `libuiohook` (input monitoring)

### Shared Types (src/shared/)
- `config.type.ts` — Configuration interface used by both main process and renderer
- `common.ts` — Frequency constants (UnicomFrequency, GuardFrequency)

## Code Style

- **TypeScript/JS**: Prettier with single quotes, 100-char width, no trailing commas
- **Indentation**: 2 spaces, LF line endings
- **C++**: clang-format (backend code)
- ESLint uses strict TypeScript checking (`strictTypeChecked` + `stylisticTypeChecked`)
- ESLint ignores: `backend/`, `node_modules/`, `dist/`, `build/`, `out/`

## Platform-Specific Notes

- **macOS**: Requires Homebrew packages `pkg-config` and `utf8proc`; window vibrancy used for transparency
- **Linux**: Requires SFML dependencies and X11/XCB development libraries; audio backends: ALSA, JACK, PulseAudio
- **Windows**: Requires Visual Studio with "Desktop development with C++" workload and Python 3.11+

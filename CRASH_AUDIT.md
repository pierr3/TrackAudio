# TrackAudio Windows Crash Audit

**Date:** 2026-02-22
**Scope:** C++ native backend, Electron main process, shutdown sequences, thread safety

## Executive Summary

This audit identified **5 Critical**, **9 High**, and **10 Medium** severity issues that could
cause crashes, freezes, or undefined behavior — particularly on Windows. The root causes fall
into three major categories:

1. **Shutdown lifecycle (double-free / use-after-free)** — `Exit()` is called multiple times during
   restart and update flows, and AFV event handlers / detached threads continue to access destroyed
   objects.
2. **Thread safety** — `mClient` (the global afv-native client) is accessed from 5+ threads without
   null checks or synchronization, and `UserSession::mtx` is held during blocking HTTP calls (up to
   10s), freezing the entire UI.
3. **Missing null/error guards** — Most N-API exported functions dereference `mClient` without
   checking for null, and most IPC handlers call native code without try/catch.

---

## Critical Issues

### C1. Double `Exit()` on restart and update — use-after-free

**Files:** `src/main/index.ts:717-733`, `src/main/index.ts:760-771`, `src/main/index.ts:429-438`

The `restart` handler calls `TrackAudioAfv.Exit()` then `app.exit()`, which fires `before-quit`,
which calls `TrackAudioAfv.Exit()` **again**. Same pattern in `quit-and-install`. The second
`Exit()` operates on already-freed memory (`mClient.reset()` was already called). On Windows this
manifests as an access violation.

```typescript
// restart handler — first Exit()
ipcMain.handle('restart', () => {
  TrackAudioAfv.Exit();   // <-- destroys mClient
  app.relaunch();
  app.exit();             // <-- fires before-quit
});

// before-quit — second Exit()
app.on('before-quit', () => {
  TrackAudioAfv.Disconnect();  // <-- mClient is null!
  TrackAudioAfv.StopMicTest(); // <-- mClient is null!
  TrackAudioAfv.Exit();        // <-- double-free!
});
```

**Fix:** Add an `isExited` flag. Guard `before-quit` with it.

---

### C2. AFV event handlers never unregistered — fire after `mClient` destroyed

**File:** `backend/src/main.cpp:581-768` (HandleAfvEvents), `backend/src/main.cpp:930-965` (Exit)

`HandleAfvEvents()` registers ~15 lambdas via `event.AddHandler<>()`. These are never removed.
During `Exit()`, `mApiServer` is reset (line 947) and `mClient` is reset (line 960), but the event
bus may still fire callbacks on worker threads that access both destroyed objects. There is no
shutdown barrier.

```cpp
// These handlers capture [&] and use global mClient + mApiServer:
event.AddHandler<afv_native::StationTransceiversUpdatedEvent>([&](...) {
    auto transceiverCount = mClient->GetTransceiverCountForStation(station); // BOOM
    MainThreadShared::mApiServer->handleAFVEventForWebsocket(...);           // BOOM
});
```

**Fix:** Either unregister handlers before destroying objects, or add a `std::atomic<bool>
shuttingDown` flag checked at the top of every handler.

---

### C3. Detached thread accesses `mClient` after potential destruction (PTT release sound)

**File:** `backend/src/main.cpp:726-731`

```cpp
if (MainThreadShared::pttReleaseSoundEnabled && mClient && mClient->IsAudioRunning()) {
    std::thread([] {
        // mClient could be destroyed by Exit() before this runs!
        mClient->PlayAdHocSound(wavPath.string(), 1.0f, ...);
    }).detach();
}
```

The null check happens before spawning the thread. By the time the detached thread runs,
`Exit()` may have destroyed `mClient`. On Windows, detached threads during DLL unload are
especially dangerous — the code itself can be unmapped from memory.

**Fix:** Replace with a joined thread, or check the shutdown flag inside the lambda.

---

### C4. Most N-API functions dereference `mClient` without null check

**File:** `backend/src/main.cpp` — ~30 functions

Functions like `GetAudioApis`, `GetAudioInputDevices`, `Disconnect`, `Connect`, `AddFrequency`,
`SetRadioEffects`, `SetHardwareType`, `GetStation`, `SetPtt`, `IsConnected`, `Reset`, etc. all
call `mClient->...` without checking if `mClient` is null. If called before `Bootstrap()` or after
`Exit()`, this is undefined behavior (null `unique_ptr` dereference = crash).

```cpp
Napi::Array GetAudioApis(const Napi::CallbackInfo& info) {
    // No null check!
    for (const auto& [apiId, apiName] : mClient->GetAudioApis()) { ... }
}
```

**Fix:** Add null guards at the top of every N-API function, or use a wrapper macro.

---

### C5. SDK WebSocket handlers access `mClient` without null checks on I/O threads

**File:** `backend/src/sdk.cpp:400-493`

`handleSetStationState` and `handleGetStationStates` run on the RESTinio I/O thread and
dereference `mClient` without null checks. During shutdown, `mClient` is null.
Null `unique_ptr` dereference is not a catchable exception — it's a segfault.

```cpp
void SDK::handleSetStationState(const nlohmann::json& json, uint64_t clientId) {
    auto rxValue = mClient->GetRxState(frequency);   // no null check!
}
```

---

## High Issues

### H1. `UserSession::mtx` held during 10-second blocking HTTP request — UI freezes

**File:** `backend/src/RemoteData.cpp:14-24`

```cpp
void RemoteData::onTimer(Poco::Timer&) {
    std::lock_guard<std::mutex> lock(m);
    std::lock_guard<std::mutex> sessionLock(UserSession::mtx);  // LOCKED
    ...
    auto slurperData = getSlurperData();  // blocks up to 10 seconds!
}
```

`UserSession::mtx` is held for the entire HTTP request duration. Meanwhile, `Connect()`,
`SetPtt()`, `SetMainRadioVolume()`, and `SetSession()` on the Node.js main thread also
acquire `UserSession::mtx`. When the slurper is slow, the Electron UI freezes completely.
On Windows, this triggers "Not Responding" and users may force-kill the app.

**Fix:** Copy needed data under the lock, release it, make the HTTP call, then re-acquire
to write results back.

---

### H2. Native callbacks fire after `Exit()` / window destruction

**File:** `src/main/index.ts:843-928`, `src/main/index.ts:930`

`handleEvent` is registered as the native callback. It calls `mainWindow?.webContents.send()`
and even `TrackAudioAfv.PlayAdHocSound()` (line 900). After `Exit()`, the native module is
destroyed. After window close, `mainWindow` references a destroyed BrowserWindow (it's never
set to null). The `?.` optional chaining does NOT protect against a destroyed-but-non-null
`BrowserWindow`.

---

### H3. `mainWindow` never set to null on close

**File:** `src/main/index.ts`

There is no `mainWindow.on('closed', () => { mainWindow = null })` handler. After the window
is destroyed, `mainWindow` still references the dead object. All `mainWindow?.` checks
throughout the code (updater events, native callbacks) provide zero protection.

---

### H4. Unhandled C++ exceptions from afv-native crossing N-API boundary

**File:** `backend/src/main.cpp` (multiple functions)

Most N-API functions call `mClient->...` which can throw arbitrary C++ exceptions (e.g.
`std::runtime_error` from afv-native). Only `Napi::Error` is properly handled by node-addon-api.
Other exception types crossing the N-API boundary is undefined behavior and will crash.

**Fix:** Wrap all afv-native calls in try/catch converting to `Napi::Error`.

---

### H5. `RadioHelper::setAllRadioVolumes()` — no `mClient` null check

**File:** `backend/include/RadioHelper.hpp:93-100`

```cpp
static void setAllRadioVolumes() {
    auto states = mClient->getRadioState();  // No null check
}
```

Called from `SetMainRadioVolume` which also has no null check before calling this.

---

### H6. `kRxBegin` handler dereferences unchecked optional `parameter3`

**File:** `backend/src/sdk.cpp:177`

```cpp
jsonMessage["value"]["activeTransmitters"] = *parameter3;  // not checked!
```

The condition checks `callsign` and `frequencyHz` but NOT `parameter3`. If it's `nullopt`,
this is UB.

---

### H7. macOS-only APIs called on Windows without platform guards

**File:** `src/main/index.ts:822-824`, `src/main/index.ts:811`

```typescript
// Called on ALL platforms — crashes on Windows!
ipcMain.handle('is-trusted-accessibility', () => {
  return systemPreferences.isTrustedAccessibilityClient(true); // macOS only
});

ipcMain.on('set-window-button-visibility', (_, status) => {
  mainWindow?.setWindowButtonVisibility(status); // macOS only, no platform check
});
```

---

### H8. `IsConnected()` called without try/catch in window close handler

**File:** `src/main/index.ts:246-265`

After `Exit()` is called from restart/update flows, the close handler still calls
`TrackAudioAfv.IsConnected()` which accesses freed memory.

---

### H9. AsyncWorker in `SetFrequencyRadioVolume` accesses `mClient` on worker thread

**File:** `backend/src/main.cpp:445-467`

The lambda runs on a libuv thread pool thread and accesses `mClient` and `mApiServer`
without null checks or synchronization. If `Exit()` runs concurrently, use-after-free.

---

## Medium Issues

### M1. Duplicate VuMeter dispatch — doubled IPC traffic

**File:** `src/main/index.ts:852-857`

```typescript
if (arg === AfvEventTypes.VuMeter) {
  mainWindow?.webContents.send('VuMeter', arg2, arg3);
}
if (arg === AfvEventTypes.VuMeter) {             // DUPLICATE!
  mainWindow?.webContents.send('VuMeter', arg2, arg3);
}
```

Copy-paste bug. Every VU meter event dispatched twice. High-frequency IPC doubling
wastes CPU and may cause jank on lower-end Windows machines.

---

### M2. `ThreadSafeFunction` never released during shutdown

**File:** `backend/src/main.cpp:288`, `backend/include/Helpers.hpp:102`

The TSF is created with initial thread count 3 but never explicitly `Release()`d or
`Abort()`ed during `Exit()`. Calling `NonBlockingCall` after the JS environment is torn
down is undefined.

---

### M3. `callbackRef` read without lock — data race

**File:** `backend/include/Helpers.hpp:115`

```cpp
if (!NapiHelpers::callbackAvailable || NapiHelpers::callbackRef == nullptr ...) {
    return;  // callbackRef read without _callElectronMutex!
}
std::lock_guard<std::mutex> lock(_callElectronMutex);
callbackRef->NonBlockingCall(...);  // could be a different pointer by now
```

---

### M4. `UserSettings` statics race between `_load()` and InputHandler timer thread

**File:** `backend/src/Shared.cpp:88-127`, `backend/src/InputHandler.cpp`

`_load()` writes `PttKey1`, `isJoystickButton1`, etc. under `UserSettings::mtx`, but the
InputHandler timer reads them under `InputHandler::m`. Different mutexes = data race during
startup.

---

### M5. SDK destructor stops server AFTER clearing WebSocket registry

**File:** `backend/src/sdk.cpp:9-30`

The server is still accepting connections between registry clear and `stop()`. A new
WebSocket connection in this window accesses the being-destroyed `SDK` object.

---

### M6. `std::atoi` integer overflow on network data

**File:** `backend/src/RemoteData.cpp:161`

```cpp
int u334 = std::atoi(res3.c_str()) * 1000;  // potential int overflow = UB
```

---

### M7. `JSON.parse` without validation in `handleEvent`

**File:** `src/main/index.ts:884`

```typescript
const update = JSON.parse(arg2) as MainVolumeChange;
configManager.updateConfig({ mainRadioVolume: update.value.volume });
```

Malformed JSON from native code = unhandled exception.

---

### M8. `audio-remove-frequency` calls `RemoveFrequency` twice

**File:** `src/main/index.ts:617-622`

```typescript
ipcMain.handle('audio-remove-frequency', (_, frequency, callsign?) => {
  if (callsign) {
    TrackAudioAfv.RemoveFrequency(frequency, callsign);  // first removal
  }
  TrackAudioAfv.RemoveFrequency(frequency);  // removes again!
});
```

---

### M9. Missing config migration (V2->V3, V3->V4)

**File:** `src/main/config.ts:179-185`

Only V1-to-V2 migration exists, but `currentSettingsVersion` is 4.

---

### M10. libuiohook on Windows — `hook_run()` / `hook_stop()` lifecycle

**File:** `backend/src/UIOHookWrapper.cpp`

On Windows, `hook_run()` starts a `GetMessage` loop. If `hook_stop()` is called before
`hook_run()` fully initializes, or the thread gets stuck, the destructor join hangs,
freezing Electron.

---

## Recommended Fix Priority

| Priority | Issue | Impact |
|----------|-------|--------|
| 1 | C1 — Double `Exit()` | Crash on restart/update (very common flow) |
| 2 | C2+C3 — Event handlers + detached thread after shutdown | Crash on disconnect/exit |
| 3 | C4+C5 — Missing `mClient` null checks everywhere | Crash on any native call after bad state |
| 4 | H1 — Session mutex held during HTTP | 10s UI freeze (appears as crash to users) |
| 5 | H2+H3 — Window/callback lifecycle | Crash during window close |
| 6 | H7 — macOS-only APIs on Windows | TypeError crash on Windows |
| 7 | M1 — Duplicate VuMeter | Performance degradation |
| 8 | All remaining Medium issues | Various edge-case crashes |

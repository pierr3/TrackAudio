import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Rectangle,
  screen,
  shell,
  systemPreferences
} from 'electron';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import Store from 'electron-store';
import { join } from 'path';
import { AfvEventTypes, TrackAudioAfv } from 'trackaudio-afv';
import icon from '../../resources/AppIcon/icon.png?asset';
import updater from 'electron-updater';

import configManager from './config';
import { AlwaysOnTopMode, RadioEffects } from '../shared/config.type';

type WindowMode = 'mini' | 'maxi';

let version: string;
let mainWindow: BrowserWindow | null;

let isAppReady = false;

let shouldAutoConnect = false;
let isConnected = false;
const defaultWindowSize = { width: 800, height: 660 };
const miniModeWidthBreakpoint = 455; // This must match the value for $mini-mode-width-breakpoint in variables.scss.
const defaultMiniModeWidth = 250; // Default width to use for mini mode if the user hasn't explicitly resized it to something else.

// This flag is set to true if the settings dialog should be shown automatically on launch.
// This happens when either there's no prior saved config, or the saved config had its audio
// settings wiped during upgrade.
let autoOpenSettings = false;

const store = new Store({ clearInvalidConfig: true });
configManager.setStore(store);

const eventQueue: [string, string, string][] = [];

/**
 * Sets the always on top state for the main window, with different
 * options depending on the platform the app is running on.
 * @param onTop True if the window should be always on top. False otherwise.
 */
const setAlwaysOnTop = (onTop: boolean) => {
  // Issue 207: Always on top wasn't working on Arch Linux in some situations, and some random old posts
  //  online seemed to indicate that explicitly specifying a level would fix it. That's how it was
  // set up for Windows anyway, so do that on every platform except MacOS.
  if (process.platform !== 'darwin') {
    mainWindow?.setAlwaysOnTop(onTop, 'normal');
  } else {
    mainWindow?.setAlwaysOnTop(onTop);
  }
};

const hasRequiredConfig = () => {
  return (
    configManager.config.cid &&
    configManager.config.password &&
    configManager.config.audioInputDeviceId &&
    configManager.config.headsetOutputDeviceId &&
    configManager.config.speakerOutputDeviceId &&
    configManager.config.audioApi !== -1
  );
};

/**
 * Checks to see if the window is in mini-mode.
 * @returns True if the window is in mini-mode, false otherwise.
 */
const isInMiniMode = () => {
  // Issue 79: Use the size of the content and the width breakpoint for mini-mode
  // to determine whether the window is in mini-mode. This solves an issue where
  // getSize() was returning a width value off by one f5rom the getMinSize()
  // call.

  if (!mainWindow) {
    return false;
  }

  return mainWindow.getContentSize()[0] <= miniModeWidthBreakpoint;
};

const setAudioSettings = () => {
  TrackAudioAfv.SetAudioSettings(
    configManager.config.audioApi,
    configManager.config.audioInputDeviceId,
    configManager.config.headsetOutputDeviceId,
    configManager.config.speakerOutputDeviceId
  );
  TrackAudioAfv.SetRadioEffects(configManager.config.radioEffects);
  TrackAudioAfv.SetHardwareType(configManager.config.hardwareType);
};

/**
 * Saves the window position and size to persistent storage. The position
 * and size of the mini vs. maxi mode window is stored separately, and the
 * one saved is selected based on the value of isInMiniMode().
 */
const saveWindowBounds = () => {
  store.set(isInMiniMode() ? 'miniBounds' : 'bounds', mainWindow?.getBounds());
};

/**
 * Restores the window to its saved position and size, depending on the window
 * mode requested.
 * @param mode The size to restore to: mini or maxi.
 */
const restoreWindowBounds = (mode: WindowMode, numOfRadios = 0) => {
  const miniModeHeight = (numOfRadios > 1 ? 22 : 33) + 24 * (numOfRadios === 0 ? 1 : numOfRadios);
  const miniModeHeightMin = 22 + 24 * (numOfRadios === 0 ? 1 : numOfRadios);

  const savedBounds = mode === 'maxi' ? store.get('bounds') : store.get('miniBounds');
  const boundsRectangle = savedBounds as Rectangle;
  if (mode === 'mini') {
    mainWindow?.setMinimumSize(250, miniModeHeightMin);
  } else {
    mainWindow?.setMinimumSize(250, 120);
  }

  if (savedBounds !== undefined && savedBounds !== null) {
    const screenArea = screen.getDisplayMatching(boundsRectangle).workArea;

    if (
      boundsRectangle.x > screenArea.x + screenArea.width ||
      boundsRectangle.x < screenArea.x ||
      boundsRectangle.y < screenArea.y ||
      boundsRectangle.y > screenArea.y + screenArea.height
    ) {
      // Reset window into existing screenarea
      const computedHeight = mode === 'mini' ? miniModeHeight : defaultWindowSize.height;
      mainWindow?.setBounds({
        x: 0,
        y: 0,
        width: defaultWindowSize.width,
        height: computedHeight
      });
    } else {
      const computedHeight = mode === 'mini' ? miniModeHeight : boundsRectangle.height;
      mainWindow?.setBounds({
        x: boundsRectangle.x,
        y: boundsRectangle.y,
        width: boundsRectangle.width,
        height: computedHeight
      });

      mainWindow?.setSize(boundsRectangle.width, computedHeight);
    }
  } else if (mode === 'mini') {
    // Handle first-time mini mode
    mainWindow?.setSize(defaultMiniModeWidth, miniModeHeight);
    mainWindow?.setMinimumSize(250, 42); // Set minimum size after setting initial size
  }
};

const toggleMiniMode = (numOfRadios = 0) => {
  // Issue 84: If the window is maximized it has to be unmaximized before
  // setting the window size to mini-mode otherwise nothing happens.
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  }

  // Persists the window bounds for either mini or maxi mode so toggling between
  // the modes puts the window back where it was last time.
  saveWindowBounds();

  if (isInMiniMode()) {
    restoreWindowBounds('maxi');
    if (process.platform === 'darwin') {
      mainWindow?.setWindowButtonVisibility(true);
    }
  } else {
    restoreWindowBounds('mini', numOfRadios);
    mainWindow?.setVibrancy('fullscreen-ui');
    mainWindow?.setBackgroundMaterial('mica');
    if (process.platform === 'darwin') {
      mainWindow?.setWindowButtonVisibility(false);
    }
  }
};

const createWindow = (): void => {
  // Set the store CID
  TrackAudioAfv.SetCid(configManager.config.cid || '');
  TrackAudioAfv.SetRadioGain(configManager.config.radioGain || 0.5);

  shouldAutoConnect =
    Boolean(process.argv.includes(app.isPackaged ? '--auto-connect' : 'auto-connect')) &&
    Boolean(hasRequiredConfig());
  const miniModeHeight = 39 + 24 * 1;
  const miniModeHeightMin = 22 + 24 * 1;

  const options: Electron.BrowserWindowConstructorOptions = {
    height: shouldAutoConnect ? miniModeHeight : defaultWindowSize.height,
    width: shouldAutoConnect ? defaultMiniModeWidth : defaultWindowSize.width,
    minWidth: 250,
    minHeight: shouldAutoConnect ? miniModeHeightMin : 120,
    icon,
    trafficLightPosition: { x: 12, y: 10 },
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  };

  if (configManager.config.transparentMiniMode && shouldAutoConnect) {
    options.vibrancy = 'fullscreen-ui';
    options.backgroundMaterial = 'acrylic';
  }

  // Create the browser window.
  mainWindow = new BrowserWindow(options);

  setAlwaysOnTop(configManager.config.alwaysOnTop === 'always' || false);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).catch((e: unknown) => {
      const err = e as Error;
      console.log(`Error opening window: ${err.message}`);
    });
    return { action: 'deny' };
  });

  if (process.platform !== 'darwin') {
    mainWindow.setMenu(null);
  }

  // Only restore bounds if not auto-connecting
  if (!shouldAutoConnect) {
    restoreWindowBounds('maxi');
  } else {
    // If auto-connecting, set minimum size for mini mode
    mainWindow.setMinimumSize(250, 42);
    if (process.platform === 'darwin') {
      mainWindow.setWindowButtonVisibility(false);
    }
  }

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch((e: unknown) => {
      const err = e as Error;
      console.error(`Unable to load main UI: ${err.message}`);
    });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((e: unknown) => {
      const err = e as Error;
      console.error(`Unable to load main UI: ${err.message}`);
    });
  }

  // Open the DevTools only in development mode.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (e) => {
    if (!mainWindow) {
      return;
    }
    if (TrackAudioAfv.IsConnected()) {
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Are you sure you want to quit?'
      });

      if (response == 1) {
        e.preventDefault();
        return;
      }
    }

    saveWindowBounds();
  });

  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (
      input.key.toLowerCase() === 'm' &&
      input.type === 'keyDown' &&
      (input.control || input.meta)
    ) {
      toggleMiniMode();
      e.preventDefault();
    }
  });

  mainWindow.on('resize', () => {
    // Issue 129: Set the always on top state on any resize, not
    // just when the mini-mode button is pressed. The resize event
    // gets fired every time the window size changes, including on toggle
    // button press, so this one handler is sufficient to cover all
    // resize cases.
    if (configManager.config.alwaysOnTop === 'inMiniMode') {
      if (isInMiniMode()) {
        setAlwaysOnTop(true);
      } else {
        setAlwaysOnTop(false);
      }
    }
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('is-window-fullscreen', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('is-window-fullscreen', false);
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('is-window-maximised', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('is-window-maximised', false);
  });

  updater.autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('check-for-updates');
  });
  updater.autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info);
  });
  updater.autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-not-available');
  });
  updater.autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err);
  });
  updater.autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('update-download-progress', progressObj);
  });
  updater.autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron');
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    configManager.loadConfig();

    // Auto open the settings dialog if the audio API is still unset at this point.
    // That happens during settings migration from v1 to v2, or on first launch.
    // Auto-show the settings dialog if the audioApi is the default value.
    autoOpenSettings = configManager.config.audioApi === -1;

    const bootstrapOutput = TrackAudioAfv.Bootstrap(process.resourcesPath);

    if (!bootstrapOutput.checkSuccessful) {
      dialog.showMessageBoxSync({
        type: 'error',
        message:
          'An error occured during the version check, either your internet connection is down or the server (raw.githubusercontent.com) is unreachable.',
        buttons: ['OK']
      });
      app.quit();
    }

    if (bootstrapOutput.needUpdate) {
      dialog.showMessageBoxSync({
        type: 'error',
        message: 'A new mandatory version is available, please update in order to continue.',
        buttons: ['OK']
      });
      app.quit();
    }

    if (!bootstrapOutput.canRun) {
      dialog.showMessageBoxSync({
        type: 'error',
        message: 'This application cannot run on this platform.',
        buttons: ['OK']
      });
      app.quit();
    }

    version = bootstrapOutput.version;

    createWindow();
  })
  .catch((e: unknown) => {
    const err = e as Error;
    console.log(`Error initializing app: ${err.message}`);
  });

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('quit', () => {
  TrackAudioAfv.Exit();
});

/**
 * Called when the navbar finished its initial loading and the settings
 * dialog can be triggered via IPC.
 */
ipcMain.handle('settings-ready', () => {
  isAppReady = true;
  while (eventQueue.length > 0) {
    const event = eventQueue.shift();
    if (!event) return;
    const [arg, arg2, arg3] = event;
    handleEvent(arg, arg2, arg3);
  }

  // Automatically show the settings dialog if the flag was set during
  // config load.
  if (autoOpenSettings) {
    mainWindow?.webContents.send('show-settings');
    autoOpenSettings = false;
  }
});

/**
 * Called by the settings component when the settings for always on top change.
 */
ipcMain.on('set-always-on-top', (_, alwaysOnTop: AlwaysOnTopMode) => {
  // Issue 90: Attempt to make always on top actually work all the time on Windows. There's
  // an old Electron bug about needing to add "normal": https://github.com/electron/electron/issues/20933.
  //
  // The test for 'always' is sufficient to handle all current cases because it is impossible to change settings
  // while in mini-mode. It's only necessary to check and see if the setting was changed to always, and if so,
  // enable on top mode. mini mode handles setting this itself.
  setAlwaysOnTop(alwaysOnTop === 'always');
  configManager.updateConfig({ alwaysOnTop });
});

ipcMain.on('set-show-expanded-rx', (_, showExpandedRx: boolean) => {
  configManager.updateConfig({ showExpandedRx });
});

ipcMain.on('set-transparent-mini-mode', (_, transparentMiniMode: boolean) => {
  configManager.updateConfig({ transparentMiniMode });
  mainWindow?.setVibrancy(transparentMiniMode ? 'fullscreen-ui' : null);
  mainWindow?.setBackgroundMaterial('none');
});

ipcMain.handle('audio-get-apis', () => {
  return TrackAudioAfv.GetAudioApis();
});

ipcMain.handle('audio-get-input-devices', (_, apiId: string) => {
  return TrackAudioAfv.GetAudioInputDevices(apiId);
});

ipcMain.handle('audio-get-output-devices', (_, apiId: string) => {
  return TrackAudioAfv.GetAudioOutputDevices(apiId);
});

ipcMain.handle('get-configuration', () => {
  return configManager.config;
});

ipcMain.handle('is-auto-connect-mode', () => {
  return shouldAutoConnect;
});

ipcMain.handle('request-ptt-key-name', (_, pttIndex: number) => {
  TrackAudioAfv.RequestPttKeyName(pttIndex);
});

ipcMain.handle('flashFrame', () => {
  mainWindow?.flashFrame(true);
});

//
// AFV audio settings
//

ipcMain.handle('set-audio-input-device', (_, audioInputDeviceId: string) => {
  configManager.updateConfig({ audioInputDeviceId });
});

ipcMain.handle('set-headset-output-device', (_, headsetOutputDeviceId: string) => {
  configManager.updateConfig({ headsetOutputDeviceId });
});

ipcMain.handle('set-speaker-output-device', (_, speakerOutputDeviceId: string) => {
  configManager.updateConfig({ speakerOutputDeviceId });
});

ipcMain.handle('set-audio-api', (_, audioApi: number) => {
  configManager.updateConfig({ audioApi });
});

ipcMain.handle('toggle-mini-mode', (_, numberOfRadios: number) => {
  toggleMiniMode(numberOfRadios);
});

//
// AFV login settings
//

ipcMain.handle('set-cid', (_, cid: string) => {
  configManager.updateConfig({ cid });
  TrackAudioAfv.SetCid(cid);
});

ipcMain.handle('set-password', (_, password: string) => {
  configManager.updateConfig({ password });
});

//
// AFV actions
//

ipcMain.handle('connect', () => {
  if (!configManager.config.password || !configManager.config.cid) {
    return false;
  }
  setAudioSettings();
  return TrackAudioAfv.Connect(configManager.config.password);
});

ipcMain.handle('disconnect', () => {
  TrackAudioAfv.Disconnect();
});

ipcMain.handle(
  'audio-add-frequency',
  (_, frequency: number, callsign: string, rx: boolean, tx: boolean) => {
    return TrackAudioAfv.AddFrequency(frequency, callsign, rx, tx);
  }
);

ipcMain.handle('audio-remove-frequency', (_, frequency: number) => {
  TrackAudioAfv.RemoveFrequency(frequency);
});

ipcMain.handle(
  'audio-set-frequency-state',
  (
    _,
    frequency: number,
    rx: boolean,
    tx: boolean,
    xc: boolean,
    onSpeaker: boolean,
    crossCoupleAcross: boolean
  ) => {
    return TrackAudioAfv.SetFrequencyState(frequency, rx, tx, xc, onSpeaker, crossCoupleAcross);
  }
);

ipcMain.handle('audio-get-frequency-state', (_, frequency: number) => {
  return TrackAudioAfv.GetFrequencyState(frequency);
});

ipcMain.handle('audio-is-frequency-active', (_, frequency: number) => {
  return TrackAudioAfv.IsFrequencyActive(frequency);
});

ipcMain.handle('get-station', (_, callsign: string) => {
  TrackAudioAfv.GetStation(callsign);
});

ipcMain.handle('refresh-station', (_, callsign: string) => {
  TrackAudioAfv.RefreshStation(callsign);
});

ipcMain.handle('setup-ptt', (_, pttIndex: number, shouldListenForJoysticks: boolean) => {
  TrackAudioAfv.SetupPttBegin(pttIndex, shouldListenForJoysticks);
});

ipcMain.handle('clear-ptt', (_, pttIndex: number) => {
  TrackAudioAfv.ClearPtt(pttIndex);
});

ipcMain.handle('set-radio-gain', (_, radioGain: number) => {
  configManager.updateConfig({ radioGain });
  TrackAudioAfv.SetRadioGain(radioGain);
});

ipcMain.handle('set-frequency-radio-gain', (_, frequency: number, radioGain: number) => {
  TrackAudioAfv.SetFrequencyRadioGain(frequency, radioGain);
});
ipcMain.handle('set-radio-effects', (_, radioEffects: RadioEffects) => {
  configManager.updateConfig({ radioEffects });
  TrackAudioAfv.SetRadioEffects(radioEffects);
});

ipcMain.handle('set-hardware-type', (_, hardwareType: number) => {
  configManager.updateConfig({ hardwareType });
  TrackAudioAfv.SetHardwareType(hardwareType);
});

ipcMain.handle('start-mic-test', () => {
  setAudioSettings();
  TrackAudioAfv.StartMicTest();
});

ipcMain.handle('stop-mic-test', () => {
  mainWindow?.webContents.send('MicTest', '0.0', '0.0');
  TrackAudioAfv.StopMicTest();
});

ipcMain.handle('update-platform', () => {
  return process.platform;
});

ipcMain.handle('close-me', () => {
  mainWindow?.close();
});

ipcMain.handle('restart', () => {
  if (TrackAudioAfv.IsConnected()) {
    TrackAudioAfv.Disconnect();
  }

  TrackAudioAfv.Exit();

  mainWindow?.close();
  createWindow();
});

ipcMain.on('check-for-updates', (event) => {
  if (process.platform === 'win32') {
    event.reply('update-not-available');
    return;
  }

  if (app.isPackaged) {
    updater.autoUpdater.autoInstallOnAppQuit = false;
    updater.autoUpdater.checkForUpdatesAndNotify().catch(() => {
      console.error(`Error checking for updates`);
    });
  } else {
    event.reply('update-not-available');
  }
});

ipcMain.on('quit-and-install', () => {
  // First disconnect TrackAudioAfv if connected
  if (TrackAudioAfv.IsConnected()) {
    TrackAudioAfv.Disconnect();
  }

  // Call Exit to clean up resources
  TrackAudioAfv.Exit();

  // Then perform the update
  updater.autoUpdater.quitAndInstall();
});

ipcMain.handle(
  'dialog',
  (
    _,
    type: 'none' | 'info' | 'error' | 'question' | 'warning',
    title: string,
    message: string,
    buttons: string[]
  ) => {
    if (!mainWindow) {
      return;
    }

    return dialog.showMessageBox(mainWindow, {
      type,
      title,
      buttons,
      message
    });
  }
);

ipcMain.handle('get-version', () => {
  return version;
});

ipcMain.on('maximise-window', () => {
  mainWindow?.maximize();
});

ipcMain.on('unmaximise-window', () => {
  mainWindow?.unmaximize();
});

ipcMain.on('minimise-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('set-minimum-size', (_, width: number, height: number) => {
  mainWindow?.setMinimumSize(width, height);
});

ipcMain.on('set-window-button-visibility', (_, status: boolean) => {
  mainWindow?.setWindowButtonVisibility(status);
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

ipcMain.on('is-window-fullscreen', () => {
  mainWindow?.webContents.send('is-window-fullscreen', mainWindow.isFullScreen());
});

ipcMain.handle('is-trusted-accessibility', () => {
  return systemPreferences.isTrustedAccessibilityClient(true);
});

//
// Callbacks
//

const handleEvent = (arg: string, arg2: string, arg3: string) => {
  if (!arg) return;

  if (!isAppReady) {
    eventQueue.push([arg, arg2, arg3]);
    return;
  }

  // Your existing event handling logic
  if (arg === AfvEventTypes.VuMeter) {
    mainWindow?.webContents.send('VuMeter', arg2, arg3);
  }
  if (arg === AfvEventTypes.VuMeter) {
    mainWindow?.webContents.send('VuMeter', arg2, arg3);
  }

  if (arg === AfvEventTypes.FrequencyRxBegin) {
    mainWindow?.webContents.send('FrequencyRxBegin', arg2);
  }

  if (arg === AfvEventTypes.FrequencyRxEnd) {
    mainWindow?.webContents.send('FrequencyRxEnd', arg2);
  }

  if (arg == AfvEventTypes.StationRxBegin) {
    mainWindow?.webContents.send('StationRxBegin', arg2, arg3);
  }

  if (arg == AfvEventTypes.StationTransceiversUpdated) {
    mainWindow?.webContents.send('station-transceivers-updated', arg2, arg3);
  }

  if (arg == AfvEventTypes.StationStateUpdate) {
    mainWindow?.webContents.send('station-state-update', arg2, arg3);
  }

  if (arg == AfvEventTypes.StationDataReceived) {
    mainWindow?.webContents.send('station-data-received', arg2, arg3);
  }

  if (arg == AfvEventTypes.PttState) {
    mainWindow?.webContents.send('PttState', arg2);
  }

  if (arg == AfvEventTypes.Error) {
    mainWindow?.webContents.send('error', arg2);
  }

  if (arg == AfvEventTypes.VoiceConnected) {
    isConnected = true;
    mainWindow?.webContents.send('VoiceConnected');
  }

  if (arg == AfvEventTypes.VoiceDisconnected) {
    isConnected = false;
    mainWindow?.webContents.send('VoiceDisconnected');
  }

  if (arg == AfvEventTypes.NetworkConnected) {
    if (shouldAutoConnect && !isConnected) {
      setAudioSettings();
      TrackAudioAfv.Connect(configManager.config.password).catch(() => {
        console.log('Failed to auto-connect to network');
      });
    }
    mainWindow?.webContents.send('network-connected', arg2, arg3);
  }

  if (arg == AfvEventTypes.NetworkDisconnected) {
    mainWindow?.webContents.send('network-disconnected');
  }

  if (arg == AfvEventTypes.PttKeySet) {
    mainWindow?.webContents.send('ptt-key-set', arg2, arg3);
  }

  if (arg == AfvEventTypes.OpenSettingsModal) {
    mainWindow?.webContents.send('show-settings');
  }
};

TrackAudioAfv.RegisterCallback(handleEvent);

import { app, BrowserWindow, dialog, ipcMain, Rectangle, screen, shell } from 'electron';

import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import * as Sentry from '@sentry/electron/main';
import Store from 'electron-store';
import { join } from 'path';
import { AfvEventTypes, TrackAudioAfv } from 'trackaudio-afv';
import icon from '../../resources/AppIcon/icon.png?asset';
import { AlwaysOnTopMode, Configuration } from './config';

Sentry.init({
  dsn: 'https://79ff6300423d5708cae256665d170c4b@o4507193732169728.ingest.de.sentry.io/4507193745145936',
  enabled: false,
  sendDefaultPii: false
});

type WindowMode = 'mini' | 'maxi';

let version: string;
let mainWindow: BrowserWindow;

const defaultWindowSize = { width: 800, height: 660 };
const miniModeWidthBreakpoint = 330; // This must match the value for $mini-mode-width-breakpoint in variables.scss.
const defaultMiniModeWidth = 300; // Default width to use for mini mode if the user hasn't explicitly resized it to something else.

let currentConfiguration: Configuration = {
  audioApi: -1,
  audioInputDeviceId: '',
  headsetOutputDeviceId: '',
  speakerOutputDeviceId: '',
  cid: '',
  password: '',
  callsign: '',
  hardwareType: 0,
  radioGain: 0,
  alwaysOnTop: 'never',
  consentedToTelemetry: undefined
};
const store = new Store();

/**
 * Sets the always on top state for the main window, with different
 * options depending on the platform the app is running on.
 * @param onTop True if the window should be always on top. False otherwise.
 */
const setAlwaysOnTop = (onTop: boolean) => {
  if (process.platform === 'win32') {
    mainWindow.setAlwaysOnTop(onTop, 'normal');
  } else {
    mainWindow.setAlwaysOnTop(onTop);
  }
};

/**
 * Checks to see if the window is in mini-mode.
 * @returns True if the window is in mini-mode, false otherwise.
 */
const isInMiniMode = () => {
  // Issue 79: Use the size of the content and the width breakpoint for mini-mode
  // to determine whether the window is in mini-mode. This solves an issue where
  // getSize() was returning a width value off by one from the getMinSize()
  // call.
  return mainWindow.getContentSize()[0] <= miniModeWidthBreakpoint;
};

const saveConfig = () => {
  store.set('configuration', JSON.stringify(currentConfiguration));
};

const setAudioSettings = () => {
  TrackAudioAfv.SetAudioSettings(
    currentConfiguration.audioApi || -1,
    currentConfiguration.audioInputDeviceId || '',
    currentConfiguration.headsetOutputDeviceId || '',
    currentConfiguration.speakerOutputDeviceId || ''
  );
  TrackAudioAfv.SetHardwareType(currentConfiguration.hardwareType || 0);
};

/**
 * Saves the window position and size to persistent storage. The position
 * and size of the mini vs. maxi mode window is stored separately, and the
 * one saved is selected based on the value of isInMiniMode().
 */
const saveWindowBounds = () => {
  store.set(isInMiniMode() ? 'miniBounds' : 'bounds', mainWindow.getBounds());
};

/**
 * Restores the window to its saved position and size, depending on the window
 * mode requested.
 * @param mode The size to restore to: mini or maxi.
 */
const restoreWindowBounds = (mode: WindowMode) => {
  const savedBounds = mode === 'maxi' ? store.get('bounds') : store.get('miniBounds');
  const boundsRectangle = savedBounds as Rectangle;
  if (savedBounds !== undefined && savedBounds !== null) {
    const screenArea = screen.getDisplayMatching(boundsRectangle).workArea;
    if (
      boundsRectangle.x > screenArea.x + screenArea.width ||
      boundsRectangle.x < screenArea.x ||
      boundsRectangle.y < screenArea.y ||
      boundsRectangle.y > screenArea.y + screenArea.height
    ) {
      // Reset window into existing screenarea
      mainWindow.setBounds({
        x: 0,
        y: 0,
        width: defaultWindowSize.width,
        height: defaultWindowSize.height
      });
    } else {
      mainWindow.setBounds(boundsRectangle);
    }
  }
  // Covers the case where the window has never been put in mini-mode before
  // and the request came from an explicit "enter mini mode action". In that
  // situation just set the window size to the default mini-mode size but
  // don't move it.
  else if (mode === 'mini') {
    mainWindow.setSize(defaultMiniModeWidth, 1);
  }
};

const toggleMiniMode = () => {
  // Issue 84: If the window is maximized it has to be unmaximized before
  // setting the window size to mini-mode otherwise nothing happens.
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  }

  // Persists the window bounds for either mini or maxi mode so toggling between
  // the modes puts the window back where it was last time.
  saveWindowBounds();

  if (isInMiniMode()) {
    restoreWindowBounds('maxi');
  } else {
    restoreWindowBounds('mini');
  }
};

const createWindow = (): void => {
  // Set the store CID
  TrackAudioAfv.SetCid(currentConfiguration.cid || '');
  TrackAudioAfv.SetRadioGain(currentConfiguration.radioGain || 0.5);

  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: defaultWindowSize.height,
    width: defaultWindowSize.width,
    minWidth: 210,
    minHeight: 120,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  setAlwaysOnTop(currentConfiguration.alwaysOnTop === 'always' || false);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.platform !== 'darwin') {
    mainWindow.setMenu(null);
  }

  // Always restore to maxi mode on app launch.
  restoreWindowBounds('maxi');

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Open the DevTools only in development mode.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (e) => {
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
    if (currentConfiguration.alwaysOnTop === 'inMiniMode') {
      if (isInMiniMode()) {
        setAlwaysOnTop(true);
      } else {
        setAlwaysOnTop(false);
      }
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  // load the configuration
  currentConfiguration = JSON.parse(store.get('configuration', '{}') as string) as Configuration;

  // Upgrade the alwaysOnTop property from yes/no to the three mode version
  if (typeof currentConfiguration.alwaysOnTop === 'boolean') {
    currentConfiguration.alwaysOnTop
      ? (currentConfiguration.alwaysOnTop = 'always')
      : (currentConfiguration.alwaysOnTop = 'never');

    saveConfig();
  }

  if (currentConfiguration.consentedToTelemetry === undefined) {
    // We have not recorded any telemetry consent yet, so we will prompt the user
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['I consent to telemetry', 'I want to opt out'],
      title: 'Telemetry consent',
      detail:
        'Only essential information from the crash report is sent, and no data leaves your device unless an error occurs. We do not record your IP address or VATSIM password. Your data would be sent to a third-party service, Sentry, to their servers located in Germany. This is entirely optional, but greatly assists in tracking down errors.',
      message:
        'TrackAudio utilizes remote telemetry in the event of a bug, sending an error report to a tool called Sentry.'
    });

    if (response === 0) {
      currentConfiguration.consentedToTelemetry = true;
    } else {
      currentConfiguration.consentedToTelemetry = false;
    }
    saveConfig();
  }

  if (currentConfiguration.consentedToTelemetry) {
    console.log('User opted into telemetry, enabling sentry');
    const sclient = Sentry.getClient();
    if (sclient) {
      // Disable sentry in debug always
      sclient.getOptions().enabled = !app.isPackaged
        ? false
        : currentConfiguration.consentedToTelemetry;
    } else {
      console.error('Could not enable sentry');
    }
  }

  const bootstrapOutput = TrackAudioAfv.Bootstrap(process.resourcesPath);

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
      message:
        'This application has experienced an error and cannot run, please check the logs for more information.',
      buttons: ['OK']
    });
    app.quit();
  }

  version = bootstrapOutput.version;

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('quit', async () => {
  await TrackAudioAfv.Exit();
});

/**
 * Called by the settings component when the settings for always on top change.
 */
ipcMain.on('set-always-on-top', (_, state: AlwaysOnTopMode) => {
  // Issue 90: Attempt to make always on top actually work all the time on Windows. There's
  // an old Electron bug about needing to add "normal": https://github.com/electron/electron/issues/20933.
  //
  // The test for 'always' is sufficient to handle all current cases because it is impossible to change settings
  // while in mini-mode. It's only necessary to check and see if the setting was changed to always, and if so,
  // enable on top mode. mini mode handles setting this itself.
  setAlwaysOnTop(state === 'always');
  currentConfiguration.alwaysOnTop = state;
  saveConfig();
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
  return currentConfiguration;
});

ipcMain.handle('request-ptt-key-name', () => {
  TrackAudioAfv.RequestPttKeyName();
});

//
// AFV audio settings
//

ipcMain.handle('set-audio-input-device', (_, deviceId: string) => {
  currentConfiguration.audioInputDeviceId = deviceId;
  saveConfig();
});

ipcMain.handle('set-headset-output-device', (_, deviceId: string) => {
  currentConfiguration.headsetOutputDeviceId = deviceId;
  saveConfig();
});

ipcMain.handle('set-speaker-output-device', (_, deviceId: string) => {
  currentConfiguration.speakerOutputDeviceId = deviceId;
  saveConfig();
});

ipcMain.handle('set-audio-api', (_, apiId: number) => {
  currentConfiguration.audioApi = apiId;
  saveConfig();
});

ipcMain.handle('toggle-mini-mode', () => {
  toggleMiniMode();
});

//
// AFV login settings
//

ipcMain.handle('set-cid', (_, cid: string) => {
  currentConfiguration.cid = cid;
  saveConfig();
  TrackAudioAfv.SetCid(cid);
});

ipcMain.handle('set-password', (_, password: string) => {
  currentConfiguration.password = password;
  saveConfig();
});

//
// AFV actions
//

ipcMain.handle('connect', () => {
  if (!currentConfiguration.password || !currentConfiguration.cid) {
    return false;
  }
  setAudioSettings();
  return TrackAudioAfv.Connect(currentConfiguration.password);
});

ipcMain.handle('disconnect', () => {
  TrackAudioAfv.Disconnect();
});

ipcMain.handle('audio-add-frequency', (_, frequency: number, callsign: string) => {
  return TrackAudioAfv.AddFrequency(frequency, callsign);
});

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

ipcMain.handle('setup-ptt', () => {
  TrackAudioAfv.SetupPttBegin();
});

ipcMain.handle('set-radio-gain', (_, gain: number) => {
  TrackAudioAfv.SetRadioGain(gain);
  currentConfiguration.radioGain = gain;
  saveConfig();
});

ipcMain.handle('set-hardware-type', (_, type: number) => {
  currentConfiguration.hardwareType = type;
  saveConfig();
  TrackAudioAfv.SetHardwareType(type);
});

ipcMain.handle('start-mic-test', () => {
  setAudioSettings();
  TrackAudioAfv.StartMicTest();
});

ipcMain.handle('stop-mic-test', () => {
  mainWindow.webContents.send('MicTest', '0.0', '0.0');
  TrackAudioAfv.StopMicTest();
});

ipcMain.handle('update-platform', () => {
  return process.platform;
});

ipcMain.handle('close-me', () => {
  mainWindow.close();
});

ipcMain.handle('change-telemetry', (_, enabled: boolean) => {
  currentConfiguration.consentedToTelemetry = enabled;
  const sclient = Sentry.getClient();
  if (sclient) {
    sclient.getOptions().enabled = enabled;
  }
  saveConfig();
});

ipcMain.handle('should-enable-renderer-telemetry', () => {
  return !app.isPackaged ? false : currentConfiguration.consentedToTelemetry;
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

//
// Callbacks
//
TrackAudioAfv.RegisterCallback((arg: string, arg2: string, arg3: string) => {
  if (!arg) {
    return;
  }

  if (arg === AfvEventTypes.VuMeter) {
    mainWindow.webContents.send('VuMeter', arg2, arg3);
  }

  if (arg === AfvEventTypes.FrequencyRxBegin) {
    mainWindow.webContents.send('FrequencyRxBegin', arg2);
  }

  if (arg === AfvEventTypes.FrequencyRxEnd) {
    mainWindow.webContents.send('FrequencyRxEnd', arg2);
  }

  if (arg == AfvEventTypes.StationRxBegin) {
    mainWindow.webContents.send('StationRxBegin', arg2, arg3);
  }

  if (arg == AfvEventTypes.StationTransceiversUpdated) {
    mainWindow.webContents.send('station-transceivers-updated', arg2, arg3);
  }

  if (arg == AfvEventTypes.StationStateUpdate) {
    mainWindow.webContents.send("station-state-update", arg2, arg3);
  }

  if (arg == AfvEventTypes.StationDataReceived) {
    mainWindow.webContents.send('station-data-received', arg2, arg3);
  }

  if (arg == AfvEventTypes.PttState) {
    mainWindow.webContents.send('PttState', arg2);
  }

  if (arg == AfvEventTypes.Error) {
    mainWindow.webContents.send('error', arg2);
  }

  if (arg == AfvEventTypes.VoiceConnected) {
    mainWindow.webContents.send('VoiceConnected');
  }

  if (arg == AfvEventTypes.VoiceDisconnected) {
    mainWindow.webContents.send('VoiceDisconnected');
  }

  if (arg == AfvEventTypes.NetworkConnected) {
    mainWindow.webContents.send('network-connected', arg2, arg3);
  }

  if (arg == AfvEventTypes.NetworkDisconnected) {
    mainWindow.webContents.send('network-disconnected');
  }

  if (arg == AfvEventTypes.PttKeySet) {
    mainWindow.webContents.send('ptt-key-set', arg2);
  }
});

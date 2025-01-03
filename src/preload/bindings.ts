import { ipcRenderer, IpcRendererEvent } from 'electron';

import { AlwaysOnTopMode, RadioEffects } from '../shared/config.type';
import { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater';

export const api = {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  on: (channel: string, listener: (...args: any[]) => void) => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    ipcRenderer.on(channel, (_event: IpcRendererEvent, ...args: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      listener(...args);
    });
  },

  onIpc<T>(channel: string, func: (data: T) => void): () => void {
    const subscription = (_event: IpcRendererEvent, args: unknown): void => {
      func(args as T);
    };

    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  setAlwaysOnTop: (state: AlwaysOnTopMode) => {
    ipcRenderer.send('set-always-on-top', state);
  },
  setShowExpandedRx: (state: boolean) => {
    ipcRenderer.send('set-show-expanded-rx', state);
  },
  setTransparentMiniMode: (state: boolean) => {
    ipcRenderer.send('set-transparent-mini-mode', state);
  },
  getAudioApis: () => ipcRenderer.invoke('audio-get-apis'),
  getAudioInputDevices: (apiId: number) => ipcRenderer.invoke('audio-get-input-devices', apiId),
  getAudioOutputDevices: (apiId: number) => ipcRenderer.invoke('audio-get-output-devices', apiId),

  getConfig: () => ipcRenderer.invoke('get-configuration'),

  setAudioApi: (apiId: number) => ipcRenderer.invoke('set-audio-api', apiId),
  setAudioInputDevice: (deviceId: string) => ipcRenderer.invoke('set-audio-input-device', deviceId),
  setHeadsetOutputDevice: (deviceId: string) =>
    ipcRenderer.invoke('set-headset-output-device', deviceId),
  setSpeakerOutputDevice: (deviceId: string) =>
    ipcRenderer.invoke('set-speaker-output-device', deviceId),

  connect: () => ipcRenderer.invoke('connect'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  setCid: (cid: string) => ipcRenderer.invoke('set-cid', cid),
  setPassword: (password: string) => ipcRenderer.invoke('set-password', password),

  GetStation: (callsign: string) => ipcRenderer.invoke('get-station', callsign),
  RefreshStation: (callsign: string) => ipcRenderer.invoke('refresh-station', callsign),

  addFrequency: (frequency: number, callsign: string) =>
    ipcRenderer.invoke('audio-add-frequency', frequency, callsign),
  removeFrequency: (frequency: number) => ipcRenderer.invoke('audio-remove-frequency', frequency),
  IsFrequencyActive: (frequency: number) =>
    ipcRenderer.invoke('audio-is-frequency-active', frequency),
  setFrequencyState: (
    frequency: number,
    rx: boolean,
    tx: boolean,
    xc: boolean,
    onSpeaker: boolean,
    crossCoupleAcross: boolean,
    isOutputMuted?: boolean,
    outputVolume?: number
  ) =>
    ipcRenderer.invoke(
      'audio-set-frequency-state',
      frequency,
      rx,
      tx,
      xc,
      onSpeaker,
      crossCoupleAcross,
      isOutputMuted,
      outputVolume
    ),
  getFrequencyState: (frequency: number) =>
    ipcRenderer.invoke('audio-get-frequency-state', frequency),

  SetupPtt: (pttIndex: number, shouldListenForJoysticks: boolean) =>
    ipcRenderer.invoke('setup-ptt', pttIndex, shouldListenForJoysticks),

  ClearPtt: (pttIndex: number) => ipcRenderer.invoke('clear-ptt', pttIndex),

  SetFrequencyRadioVolume: (frequency: number, stationVolume: number) =>
    ipcRenderer.invoke('set-frequency-radio-volume', frequency, stationVolume),
  SetMainRadioVolume: (mainRadioVolume: number) =>
    ipcRenderer.invoke('set-main-radio-volume', mainRadioVolume),

  SetRadioEffects: (type: RadioEffects) => ipcRenderer.invoke('set-radio-effects', type),

  SetHardwareType: (type: number) => ipcRenderer.invoke('set-hardware-type', type),

  getVersion: () => ipcRenderer.invoke('get-version'),

  StartMicTest: () => ipcRenderer.invoke('start-mic-test'),
  StopMicTest: () => ipcRenderer.invoke('stop-mic-test'),

  UpdatePlatform: () => ipcRenderer.invoke('update-platform'),

  CloseMe: () => ipcRenderer.invoke('close-me'),
  Restart: () => ipcRenderer.invoke('restart'),

  RequestPttKeyName: (pttIndex: number) => ipcRenderer.invoke('request-ptt-key-name', pttIndex),

  toggleMiniMode: (numberOfRadios: number) =>
    ipcRenderer.invoke('toggle-mini-mode', numberOfRadios),

  dialog: (
    type: 'none' | 'info' | 'error' | 'question' | 'warning',
    title: string,
    message: string,
    buttons: string[]
  ) => ipcRenderer.invoke('dialog', type, title, message, buttons),

  settingsReady: () => ipcRenderer.invoke('settings-ready'),

  isTrustedAccessibility(): Promise<boolean> {
    return ipcRenderer.invoke('is-trusted-accessibility') as Promise<boolean>;
  },

  updater: {
    checkForUpdates(): Promise<void> {
      return new Promise<void>((resolve) => {
        ipcRenderer.once('check-for-updates', () => {
          resolve();
        });
        ipcRenderer.send('check-for-updates');
      });
    },

    onCheckingForUpdate(callback: () => void): () => void {
      return api.onIpc('check-for-updates', () => {
        callback();
      });
    },

    quitAndInstall(): void {
      ipcRenderer.send('quit-and-install');
    },

    onUpdateAvailable(): Promise<UpdateInfo> {
      return new Promise<UpdateInfo>((resolve) => {
        ipcRenderer.once('update-available', (_event, info: UpdateInfo) => {
          resolve(info);
        });
      });
    },

    onUpdateNotAvailable(): Promise<void> {
      return new Promise<void>((resolve) => {
        ipcRenderer.once('update-not-available', () => {
          resolve();
        });
      });
    },

    onUpdateError(callback: (error: Error) => void): () => void {
      return api.onIpc<Error>('update-error', (error) => {
        callback(error);
      });
    },

    onUpdateDownloadProgress(callback: (progressObj: ProgressInfo) => void): () => void {
      return api.onIpc<ProgressInfo>('update-download-progress', (info) => {
        callback(info);
      });
    },

    onUpdateDownloaded(): Promise<UpdateDownloadedEvent> {
      return new Promise<UpdateDownloadedEvent>((resolve) => {
        ipcRenderer.once('update-downloaded', (_event, info: UpdateDownloadedEvent) => {
          resolve(info);
        });
      });
    }
  },

  window: {
    checkIsFullscreen(): void {
      ipcRenderer.send('is-window-fullscreen');
    },
    minimise: (): void => {
      ipcRenderer.send('minimise-window');
    },
    maximise: (): void => {
      ipcRenderer.send('maximise-window');
    },
    unmaximise: (): void => {
      ipcRenderer.send('unmaximise-window');
    },
    close: (): void => {
      ipcRenderer.send('close-window');
    },
    isFullScreen: (callback: (status: boolean) => void): (() => void) => {
      return api.onIpc<boolean>('is-window-fullscreen', (data) => {
        callback(data);
      });
    },
    isMaximised: (callback: (status: boolean) => void): (() => void) => {
      return api.onIpc<boolean>('is-window-maximised', (data) => {
        callback(data);
      });
    },
    setMinimumSize: (width: number, height: number): void => {
      ipcRenderer.send('set-minimum-size', width, height);
    },
    setWindowButtonVisibility: (status: boolean): void => {
      ipcRenderer.send('set-window-button-visibility', status);
    }
  },

  log: {
    info: (message: string) => {
      ipcRenderer.send('log-info', message);
    },
    warn: (message: string) => {
      ipcRenderer.send('log-warn', message);
    },
    error: (message: string) => {
      ipcRenderer.send('log-error', message);
    }
  }
};

export type API = typeof api;

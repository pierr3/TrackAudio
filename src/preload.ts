// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { ipcRenderer, contextBridge, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("api", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (channel: string, listener: (...args: any[]) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipcRenderer.on(channel, (event: IpcRendererEvent, ...args: any[]) =>
      listener(...args)
    );
  },

  setAlwaysOnTop: (state: boolean) =>
    ipcRenderer.send("set-always-on-top", state),
  getAudioApis: () => ipcRenderer.invoke("audio-get-apis"),
  getAudioInputDevices: (apiId: string) =>
    ipcRenderer.invoke("audio-get-input-devices", apiId),
  getAudioOutputDevices: (apiId: string) =>
    ipcRenderer.invoke("audio-get-output-devices", apiId),

  getConfig: () => ipcRenderer.invoke("get-configuration"),

  setAudioApi: (apiId: number) => ipcRenderer.invoke("set-audio-api", apiId),
  setAudioInputDevice: (deviceId: string) =>
    ipcRenderer.invoke("set-audio-input-device", deviceId),
  setHeadsetOutputDevice: (deviceId: string) =>
    ipcRenderer.invoke("set-headset-output-device", deviceId),
  setSpeakerOutputDevice: (deviceId: string) =>
    ipcRenderer.invoke("set-speaker-output-device", deviceId),

  connect: () => ipcRenderer.invoke("connect"),
  disconnect: () => ipcRenderer.invoke("disconnect"),
  setCid: (cid: string) => ipcRenderer.invoke("set-cid", cid),
  setPassword: (password: string) =>
    ipcRenderer.invoke("set-password", password),

  GetStation: (callsign: string) => ipcRenderer.invoke("get-station", callsign),
  RefreshStation: (callsign: string) =>
    ipcRenderer.invoke("refresh-station", callsign),

  addFrequency: (frequency: number, callsign: string) =>
    ipcRenderer.invoke("audio-add-frequency", frequency, callsign),
  removeFrequency: (frequency: number) =>
    ipcRenderer.invoke("audio-remove-frequency", frequency),
  IsFrequencyActive: (frequency: number) =>
    ipcRenderer.invoke("audio-is-frequency-active", frequency),
  setFrequencyState: (
    frequency: number,
    rx: boolean,
    tx: boolean,
    xc: boolean,
    onSpeaker: boolean
  ) =>
    ipcRenderer.invoke(
      "audio-set-frequency-state",
      frequency,
      rx,
      tx,
      xc,
      onSpeaker
    ),
  getFrequencyState: (frequency: number) =>
    ipcRenderer.invoke("audio-get-frequency-state", frequency),

  SetupPtt: () => ipcRenderer.invoke("setup-ptt"),

  SetRadioGain: (gain: number) => ipcRenderer.invoke("set-radio-gain", gain),

  SetHardwareType: (type: number) => ipcRenderer.invoke("set-hardware-type", type),

  getVersion: () => ipcRenderer.invoke("get-version"),
});

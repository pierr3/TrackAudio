// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
    setAlwaysOnTop: (state: boolean) => ipcRenderer.send('set-always-on-top', state),
    getAudioApis: () => ipcRenderer.invoke('audio-get-apis'),
    getAudioInputDevices: (apiId: string) => ipcRenderer.invoke('audio-get-input-devices', apiId),
    getAudioOutputDevices: (apiId: string) => ipcRenderer.invoke('audio-get-output-devices', apiId),
});
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
    setAlwaysOnTop: (state: boolean) => ipcRenderer.send('set-always-on-top', state),
});
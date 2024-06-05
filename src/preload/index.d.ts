import { ElectronAPI } from '@electron-toolkit/preload';
import { API } from './bindings';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
}

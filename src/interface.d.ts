import { AudioApi } from "../backend/js/trackaudio-afv.d";

export interface IElectronAPI {
    setAlwaysOnTop: (state: boolean) => Promise<void>;
    getAudioApis: () => Promise<Array<AudioApi>>;
    getAudioInputDevices: (apiId: number) => Promise<Array<AudioDevice>>;
    getAudioOutputDevices: (apiId: number) => Promise<Array<AudioDevice>>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

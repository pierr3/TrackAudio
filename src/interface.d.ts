import { AudioApi } from "../backend/js/trackaudio-afv.d";
import { Configuration } from "./config.d";

export interface IElectronAPI {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on: (channel: string, listener: (...args: any[]) => void) => void;

    setAlwaysOnTop: (state: boolean) => Promise<void>;
    getAudioApis: () => Promise<Array<AudioApi>>;
    getAudioInputDevices: (apiId: number) => Promise<Array<AudioDevice>>;
    getAudioOutputDevices: (apiId: number) => Promise<Array<AudioDevice>>;

    getConfig: () => Promise<Configuration>;
    setAudioApi: (apiId: number) => Promise<void>;
    setAudioInputDevice: (deviceId: string) => Promise<void>;
    setHeadsetOutputDevice: (deviceId: string) => Promise<void>;
    setSpeakerOutputDevice: (deviceId: string) => Promise<void>;

    connect: () => Promise<boolean>;
    disconnect: () => Promise<void>;
    setCid: (cid: string) => Promise<void>;
    setPassword: (password: string) => Promise<void>;

    GetStation: (callsign: string) => Promise<void>
    RefreshStation: (callsign: string) => Promise<void>;

    addFrequency: (frequency: number, callsign: string) => Promise<boolean>;
    removeFrequency: (frequency: number) => Promise<void>;
    setFrequencyState: (frequency: number, rx: boolean, tx: boolean, xc: boolean, onSpeaker: boolean) => Promise<boolean>;
    getFrequencyState: (frequency: number) => Promise<{rx: boolean, tx: boolean, xc: boolean, onSpeaker: boolean}>;
    IsFrequencyActive: (frequency: number) => Promise<boolean>;

    SetupPtt(): Promise<void>;
    SetRadioGain(gain: number): Promise<void>;

    getVersion: () => Promise<string>;
  }

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

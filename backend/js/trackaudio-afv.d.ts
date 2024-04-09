export interface AudioApi {
  id: string;
  name: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface TrackAudioAfv {
  GetVersion(): string;
  GetAudioApis(): Array<AudioApi>;

  GetAudioOutputDevices: (apiId: string) => Promise<Array<AudioDevice>>;
  GetAudioInputDevices: (apiId: string) => Promise<Array<AudioDevice>>;

  Connect: (cid: string, password: string, callsign: string) => Promise<boolean>;
  Disconnect: () => Promise<void>;
  SetAudioSettings: (
    apiId: number,
    inputDevice: string,
    headsetDevice: string,
    speakerDevice: string
  ) => Promise<void>;
}

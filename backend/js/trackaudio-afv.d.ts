export interface AudioApi {
  id: number;
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

  Connect: (password: string) => Promise<boolean>;
  Disconnect: () => void;
  SetAudioSettings: (
    apiId: number,
    inputDevice: string,
    headsetDevice: string,
    speakerDevice: string
  ) => void;

  AddFrequency: (frequency: number, callign: string) => Promise<boolean>;
  RemoveFrequency: (frequency: number) => void;
  IsFrequencyActive: (frequency: number) => boolean;

  GetStation: (callsign: string) => Promise<void>;
  RefreshStation: (callsign: string) => Promise<void>;

  SetFrequencyState: (
    frequency: number,
    rx: boolean,
    tx: boolean,
    xc: boolean,
    onSpeaker: boolean
  ) => Promise<boolean>;

  GetFrequencyState: (frequency: number) => Promise<{
    rx: boolean;
    tx: boolean;
    xc: boolean;
    onSpeaker: boolean;
  }>;

  SetCid: (cid: string) => void;

  SetRadioGain: (gain: number) => void;
  SetPtt: (activate: boolean) => void;

  RegisterCallback: (
    func: (arg: string, arg2: string, arg3: string) => void
  ) => void;
}

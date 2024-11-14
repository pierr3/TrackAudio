export declare interface AudioApi {
  id: number;
  name: string;
}

export declare interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export declare const AfvEventTypes: {
  Error: string;
  VoiceConnected: string;
  VoiceDisconnected: string;
  StationTransceiversUpdated: string;
  StationDataReceived: string;
  FrequencyRxBegin: string;
  FrequencyRxEnd: string;
  StationRxBegin: string;
  PttState: string;
  NetworkConnected: string;
  NetworkDisconnected: string;
  VuMeter: string;
  PttKeySet: string;
  FrequencyStateUpdate: string;
  StationStateUpdate: string;
  OpenSettingsModal: string;
};

declare namespace TrackAudioAfv {
  export function GetVersion(): string;
  export function GetAudioApis(): Array<AudioApi>;

  export function GetAudioOutputDevices(
    apiId: string
  ): Promise<Array<AudioDevice>>;
  export function GetAudioInputDevices(
    apiId: string
  ): Promise<Array<AudioDevice>>;

  export function Connect(password: string): Promise<boolean>;
  export function Disconnect(): void;
  export function SetAudioSettings(
    apiId: number,
    inputDevice: string,
    headsetDevice: string,
    speakerDevice: string
  ): void;

  export function AddFrequency(
    frequency: number,
    callign: string
  ): Promise<boolean>;
  export function RemoveFrequency(frequency: number): void;
  export function IsFrequencyActive(frequency: number): boolean;

  export function GetStation(callsign: string): void;
  export function RefreshStation(callsign: string): void;

  export function SetFrequencyState(
    frequency: number,
    rx: boolean,
    tx: boolean,
    xc: boolean,
    onSpeaker: boolean,
    crossCoupleAcross: boolean
  ): Promise<boolean>;

  export function GetFrequencyState(frequency: number): Promise<{
    rx: boolean;
    tx: boolean;
    xc: boolean;
    onSpeaker: boolean;
  }>;

  export function SetCid(cid: string): void;

  export function SetRadioGain(gain: number): void;
  export function SetFrequencyRadioGain(frequency: number, gain: number): void;
  export function SetPtt(activate: boolean): void;

  export function SetRadioEffects(type: string): void;

  export function SetHardwareType(type: number): void;

  export function StartMicTest(): void;
  export function StopMicTest(): void;

  export function RegisterCallback(
    func: (arg: string, arg2: string, arg3: string) => void
  ): void;

  export function SetupPttBegin(pttIndex: number): void;
  export function SetupPttEnd(): void;

  export function RequestPttKeyName(pttIndex: number): void;

  export function IsConnected(): boolean;
  export function Bootstrap(resourcePath: string): {
    canRun: boolean;
    needUpdate: boolean;
    version: string;
    checkSuccessful: boolean;
  };
  export function Exit(): boolean;
}

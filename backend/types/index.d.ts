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
  StationRxEnd: string;
  PttState: string;
  NetworkConnected: string;
  NetworkDisconnected: string;
  VuMeter: string;
  PttKeySet: string;
  FrequencyStateUpdate: string;
  StationStateUpdate: string;
  OpenSettingsModal: string;
  MainVolumeChange: string;
};

export declare interface Session {
  calos: string;
  fab: number;
  cinto : string;
  lacra: number;
  linstal: number;
  ianto: boolean;
}

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
    callign: string,
    outputVolume?: number,
  ): Promise<boolean>;
  export function RemoveFrequency(
    frequency: number,
    callsign?: string,
  ): void;
  export function IsFrequencyActive(frequency: number): boolean;

  export function GetStation(callsign: string): void;
  export function RefreshStation(callsign: string): void;

  export function SetFrequencyState(
    callsign: string,
    frequency: number,
    rx: boolean,
    tx: boolean,
    xc: boolean,
    onSpeaker: boolean,
    crossCoupleAcross: boolean,
    isOutputMuted?: boolean,
    outputGain?: number,
  ): Promise<boolean>;

  export function GetFrequencyState(frequency: number): Promise<{
    rx: boolean;
    tx: boolean;
    xc: boolean;
    onSpeaker: boolean;
    isOutputMuted: boolean;
    outputGain: number;
  }>;

  export function SetCid(cid: string): void;

  export function SetMainRadioVolume(volume: number): void;
  export function SetFrequencyRadioVolume(frequency: number, stationVolume: number): void;
  export function SetPtt(activate: boolean): void;

  export function ClearPtt(pttIndex: number): void;

  export function SetRadioEffects(type: string): void;

  export function SetHardwareType(type: number): void;

  export function StartMicTest(): void;
  export function StopMicTest(): void;

  export function RegisterCallback(
    func: (arg: string, arg2: string, arg3: string, arg4: string) => void
  ): void;

  export function SetupPttBegin(pttIndex: number, shouldListenForJoysticks?: boolean): void;
  export function SetupPttEnd(): void;

  export function RequestPttKeyName(pttIndex: number): void;

  export function IsConnected(): boolean;
  export function Bootstrap(resourcePath: string, request?: string): {
    canRun: boolean;
    needUpdate: boolean;
    version: string;
    checkSuccessful: boolean;
  };

  export function GetLoggerFilePath(): string;

  export function Exit(): boolean;

  export function SetSession(session: Session): void;
}


export declare interface AudioApi {
  id: number;
  name: string;
}

export declare interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export enum AFVEventTypes {
  Error = "error",
  VoiceConnected = "VoiceConnected",
  VoiceDisconnected = "VoiceDisconnected",
  StationTransceiversUpdated = "StationTransceiversUpdated",
  StationDataReceived = "StationDataReceived",
  FrequencyRxBegin = "FrequencyRxBegin",
  FrequencyRxEnd = "FrequencyRxEnd",
  PttState = "PttState",
  NetworkConnected = "network-connected",
  NetworkDisconnected = "network-disconnected",
}

declare namespace TrackAudioAfv {
      export function GetVersion(): string;
      export function GetAudioApis(): Array<AudioApi>;

      export function GetAudioOutputDevices(apiId: string): Promise<Array<AudioDevice>>;
      export function GetAudioInputDevices(apiId: string): Promise<Array<AudioDevice>>;

      export function Connect(password: string): Promise<boolean>;
      export function Disconnect(): void;
      export function SetAudioSettings(
        apiId: number,
        inputDevice: string,
        headsetDevice: string,
        speakerDevice: string
      ): void;

      export function AddFrequency(frequency: number, callign: string): Promise<boolean>;
      export function RemoveFrequency(frequency: number): void;
      export function IsFrequencyActive(frequency: number): boolean;

      export function GetStation(callsign: string): Promise<void>;
      export function RefreshStation(callsign: string): Promise<void>;

      export function SetFrequencyState(
        frequency: number,
        rx: boolean,
        tx: boolean,
        xc: boolean,
        onSpeaker: boolean
      ): Promise<boolean>;

      export function GetFrequencyState(frequency: number): Promise<{
        rx: boolean;
        tx: boolean;
        xc: boolean;
        onSpeaker: boolean;
      }>;

      export function SetCid(cid: string): void;

      export function SetRadioGain(gain: number): void;
      export function SetPtt(activate: boolean): void;

      export function SetHardwareType(type: number): void;

      export function RegisterCallback(
        func: (arg: string, arg2: string, arg3: string) => void
      ): void;

      export function Bootstrap(resourcePath: string): Promise<boolean>;
      export function Exit(): void;
}

export interface Configuration {
  audioApi: number;
  audioInputDeviceId: string;
  headsetOutputDeviceId: string;
  speakerOutputDeviceId: string;

  cid: string;
  password: string;
  callsign: string;

  pttKey: number;
  pttKeyName: string;
  hardwareType: number;
  radioGain: number;

  alwaysOnTop: boolean;

  consentedToTelemetry: boolean | undefined;
}

export type AlwaysOnTopMode = 'never' | 'always' | 'inMiniMode';

export interface Configuration {
  audioApi: number;
  audioInputDeviceId: string;
  headsetOutputDeviceId: string;
  speakerOutputDeviceId: string;

  cid: string;
  password: string;
  callsign: string;

  hardwareType: number;
  radioGain: number;

  alwaysOnTop: AlwaysOnTopMode;
  consentedToTelemetry: boolean | undefined;
}

export type AlwaysOnTopMode = 'never' | 'always' | 'inMiniMode';
export type RadioEffects = 'on' | 'input' | 'output' | 'off';

export interface Configuration {
  version?: number;

  audioApi: number;
  audioInputDeviceId: string;
  headsetOutputDeviceId: string;
  speakerOutputDeviceId: string;

  cid: string;
  password: string;
  callsign: string;

  hardwareType: number;
  radioGain: number;

  // Boolean is the prior type for this property, AlwaysOnTopMode is the updated type.
  alwaysOnTop: boolean | AlwaysOnTopMode;
  radioEffects: RadioEffects;
}

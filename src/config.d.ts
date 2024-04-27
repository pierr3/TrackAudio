export interface Configuration {
    audioApi: number;
    audioInputDeviceId: string;
    headsetOutputDeviceId: string;
    speakerOutputDeviceId: string;

    cid: string;
    password: string;
    callsign: string;

    pttKey: number;
    hardwareType: number;
    radioGain: number;
}
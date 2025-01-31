export interface StationStateUpdate {
  type: 'kStationStateUpdate';
  value: {
    callsign?: string;
    frequency: number;
    rx: boolean;
    tx: boolean;
    xc: boolean;
    xca: boolean;
    headset: boolean;
    outputVolume: number;
    isOutputMuted: boolean;
  };
}

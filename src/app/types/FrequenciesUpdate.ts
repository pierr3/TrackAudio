export interface Radio {
  pFrequencyHz: number;
  pCallsign: string;
}

export interface StationStateUpdate {
  type: "kStationStateUpdate";
  value: {
    callsign: string | undefined;
    frequency: number;
    rx: boolean;
    tx: boolean;
    xc: boolean;
    headset: boolean;
  };
}

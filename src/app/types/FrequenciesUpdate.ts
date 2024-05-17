export interface Radio {
  pFrequencyHz: number;
  pCallsign: string;
}

export interface FrequenciesUpdate {
  type: "kFrequencyStateUpdate";
  value: {
    rx: Radio[];
    tx: Radio[];
    xc: Radio[];
    allRadios: Radio[];
  };
}

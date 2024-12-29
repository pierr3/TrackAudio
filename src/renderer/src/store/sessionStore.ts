import { create } from 'zustand';

interface sessionStore {
  callsign: string;
  isAtc: boolean;
  isNetworkConnected: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  version: string;
  frequency: number;
  radioGain: number;
  stationCallsign: string;
  connectTimestamp: number | null;

  setCallsign: (callsign: string) => void;
  setIsAtc: (isAtc: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setVersion: (version: string) => void;
  setNetworkConnected: (isConnected: boolean) => void;
  setFrequency: (frequency: number) => void;
  setMainRadioVolume: (mainRadioVolume: number) => void;
  setStationCallsign: (stationCallsign: string) => void;
  getStationCallsign: () => string;
  getIsAtc: () => boolean;
}

const useSessionStore = create<sessionStore>((set) => ({
  callsign: '',
  isAtc: false,
  isConnected: false,
  isConnecting: false,
  isNetworkConnected: false,
  frequency: 199998000,
  version: '0.0.0',
  pttKeyName: '',
  radioGain: 50,
  stationCallsign: '',
  connectTimestamp: null,

  setCallsign: (callsign) => {
    set({ callsign });
  },
  setIsAtc: (isAtc) => {
    set({ isAtc });
  },
  setIsConnected: (isConnected) => {
    set({ isConnected });
    set({ connectTimestamp: isConnected ? Date.now() : null });
  },
  setIsConnecting: (isConnecting) => {
    set({ isConnecting });
  },
  setVersion: (version) => {
    set({ version });
  },
  setNetworkConnected: (isConnected) => {
    set({ isNetworkConnected: isConnected });
  },
  setFrequency: (frequency) => {
    set({ frequency });
  },
  setMainRadioVolume: (mainRadioVolume) => {
    set({ radioGain: mainRadioVolume });
  },
  setStationCallsign: (stationCallsign) => {
    set({ stationCallsign });
  },
  getStationCallsign: (): string => {
    return useSessionStore.getState().stationCallsign;
  },
  getIsAtc: (): boolean => {
    return useSessionStore.getState().isAtc;
  }
}));

export default useSessionStore;

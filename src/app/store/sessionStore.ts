import { create } from "zustand";

interface sessionStore {
  callsign: string;
  isAtc: boolean;
  isNetworkConnected: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  version: string;
  frequency: number;
  pttKeyName: string;
  radioGain: number;
  stationCallsign: string;
  setCallsign: (callsign: string) => void;
  setIsAtc: (isAtc: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setVersion: (version: string) => void;
  setNetworkConnected: (isConnected: boolean) => void;
  setFrequency: (frequency: number) => void;
  setPttKeyName: (pttKeyName: string) => void;
  setRadioGain: (radioGain: number) => void;
  setStationCallsign: (stationCallsign: string) => void;
  getStationCallsign: () => string;
  getIsAtc: () => boolean;
}

const useSessionStore = create<sessionStore>((set) => ({
  callsign: "",
  isAtc: false,
  isConnected: false,
  isConnecting: false,
  isNetworkConnected: false,
  frequency: 199998000,
  version: "0.0.0",
  pttKeyName: "",
  radioGain: 50,
  stationCallsign: "",
  setCallsign: (callsign) => {
    set({ callsign });
  },
  setIsAtc: (isAtc) => {
    set({ isAtc });
  },
  setIsConnected: (isConnected) => {
    set({ isConnected });
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
  setPttKeyName: (pttKeyName) => {
    set({ pttKeyName });
  },
  setRadioGain: (radioGain) => {
    set({ radioGain });
  },
  setStationCallsign: (stationCallsign) => {
    set({ stationCallsign });
  },
  getStationCallsign: (): string => {
    return useSessionStore.getState().stationCallsign;
  },
  getIsAtc: (): boolean => {
    return useSessionStore.getState().isAtc;
  },
}));

export default useSessionStore;

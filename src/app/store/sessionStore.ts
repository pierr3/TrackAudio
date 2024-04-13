import { create } from "zustand";

type sessionStore = {
  callsign: string;
  isAtc: boolean;
  isNetworkConnected: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  version: string;
  frequency: number;
  pttKeyName: string;
  radioGain: number;
  setCallsign: (callsign: string) => void;
  setIsAtc: (isAtc: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setVersion: (version: string) => void;
  setNetworkConnected: (isConnected: boolean) => void;
  setFrequency: (frequency: number) => void;
  setPttKeyName: (pttKeyName: string) => void;
  setRadioGain: (radioGain: number) => void;
};

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
  setCallsign: (callsign) => set({ callsign }),
  setIsAtc: (isAtc) => set({ isAtc }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setVersion: (version) => set({ version }),
  setNetworkConnected: (isConnected) => set({ isNetworkConnected: isConnected }),
  setFrequency: (frequency) => set({ frequency }),
  setPttKeyName: (pttKeyName) => set({ pttKeyName }),
  setRadioGain: (radioGain) => set({ radioGain }),
}));

export default useSessionStore;

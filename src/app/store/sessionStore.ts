import { create } from "zustand";

type sessionStore = {
    callsign: string;
    isAtc: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    setCallsign: (callsign: string) => void;
    setIsAtc: (isAtc: boolean) => void;
    setIsConnected: (isConnected: boolean) => void;
    setIsConnecting: (isConnecting: boolean) => void;
};

const useSessionStore = create<sessionStore>((set) => ({
    callsign: "",
    isAtc: false,
    isConnected: false,
    isConnecting: false,
    setCallsign: (callsign) => set({ callsign }),
    setIsAtc: (isAtc) => set({ isAtc }),
    setIsConnected: (isConnected) => set({ isConnected }),
    setIsConnecting: (isConnecting) => set({ isConnecting }),
}));

export default useSessionStore;

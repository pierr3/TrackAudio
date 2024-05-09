import { create } from "zustand";

interface UtilStore {
  vu: number;
  peakVu: number;
  platform: string;
  pttKeyName: string;
  hasPttBeenSetDuringSetup: boolean;
  setPttKeyName: (pttKeyName: string) => void;
  updateVu: (vu: number, peakVu: number) => void;
  updatePlatform: (platform: string) => void;
  updatePttKeySet: (hasPttBeenSetDuringSetup: boolean) => void;
}

const useUtilStore = create<UtilStore>((set) => ({
  vu: 0,
  peakVu: 0,
  platform: "",
  pttKeyName: "",
  hasPttBeenSetDuringSetup: false,
  setPttKeyName: (pttKeyName: string) => {
    set({ pttKeyName });
  },
  updateVu: (vu: number, peakVu: number) => {
    set({ vu, peakVu });
  },
  updatePlatform: (platform: string) => {
    set({ platform });
  },
  updatePttKeySet: (hasPttBeenSetDuringSetup: boolean) => {
    set({ hasPttBeenSetDuringSetup });
  },
}));

export default useUtilStore;

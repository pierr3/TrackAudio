import { create } from "zustand";

interface UtilStore {
  vu: number;
  peakVu: number;
  platform: string;
  pttKeyName: string;
  setPttKeyName: (pttKeyName: string) => void;
  updateVu: (vu: number, peakVu: number) => void;
  updatePlatform: (platform: string) => void;
}

const useUtilStore = create<UtilStore>((set) => ({
  vu: 0,
  peakVu: 0,
  platform: "",
  pttKeyName: "",
  setPttKeyName: (pttKeyName: string) => {
    set({ pttKeyName });
  },
  updateVu: (vu: number, peakVu: number) => {
    set({ vu, peakVu });
  },
  updatePlatform: (platform: string) => {
    set({ platform });
  },
}));

export default useUtilStore;

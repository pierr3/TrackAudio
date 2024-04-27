import { create } from "zustand";

type UtilStore = {
  vu: number;
  peakVu: number;
  platform: string;
  updateVu: (vu: number, peakVu: number) => void;
  updatePlatform: (platform: string) => void;
};

const useUtilStore = create<UtilStore>((set) => ({
  vu: 0,
  peakVu: 0,
  platform: "",
  updateVu: (vu: number, peakVu: number) => {
    set({ vu, peakVu });
  },
  updatePlatform: (platform: string) => {
    set({ platform });
  },
}));

export default useUtilStore;

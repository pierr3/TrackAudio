import { create } from "zustand";

type UtilStore = {
  vu: number;
  peakVu: number;
  updateVu: (vu: number, peakVu: number) => void;
};

const useUtilStore = create<UtilStore>((set) => ({
  vu: 0,
  peakVu: 0,
  updateVu: (vu: number, peakVu: number) => {
    set({ vu, peakVu });
  },
}));

export default useUtilStore;

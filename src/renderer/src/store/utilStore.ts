import { create } from 'zustand';

interface UtilStore {
  vu: number;
  peakVu: number;
  platform: string;
  ptt1KeyName: string;
  ptt2KeyName: string;
  isWindowFullscreen: boolean;
  isWindowMaximised: boolean;
  hasPtt1BeenSetDuringSetup: boolean;
  hasPtt2BeenSetDuringSetup: boolean;
  setPtt1KeyName: (ptt1KeyName: string) => void;
  setPtt2KeyName: (ptt2KeyName: string) => void;
  updateVu: (vu: number, peakVu: number) => void;
  updatePlatform: (platform: string) => void;
  updatePtt1KeySet: (hasPtt1BeenSetDuringSetup: boolean) => void;
  updatePtt2KeySet: (hasPtt2BeenSetDuringSetup: boolean) => void;
  setWindowFullscreen: (fullscreen: boolean) => void;
  setWindowMaximised: (maximised: boolean) => void;
}

const useUtilStore = create<UtilStore>((set) => ({
  vu: 0,
  peakVu: 0,
  platform: '',
  ptt1KeyName: '',
  ptt2KeyName: '',
  hasPtt1BeenSetDuringSetup: false,
  hasPtt2BeenSetDuringSetup: false,
  isWindowFullscreen: false,
  isWindowMaximised: false,
  setPtt1KeyName: (ptt1KeyName: string) => {
    set({ ptt1KeyName });
  },
  setPtt2KeyName: (ptt2KeyName: string) => {
    set({ ptt2KeyName });
  },
  updateVu: (vu: number, peakVu: number) => {
    set({ vu, peakVu });
  },
  updatePlatform: (platform: string) => {
    set({ platform });
  },
  updatePtt1KeySet: (hasPtt1BeenSetDuringSetup: boolean) => {
    set({ hasPtt1BeenSetDuringSetup });
  },
  updatePtt2KeySet: (hasPtt2BeenSetDuringSetup: boolean) => {
    set({ hasPtt2BeenSetDuringSetup });
  },
  setWindowFullscreen: (fullscreen: boolean): void => {
    set({ isWindowFullscreen: fullscreen });
  },
  setWindowMaximised: (maximised: boolean): void => {
    set({ isWindowMaximised: maximised });
  }
}));

export default useUtilStore;

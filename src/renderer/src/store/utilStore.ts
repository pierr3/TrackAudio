import { create } from 'zustand';

interface UtilStore {
  vu: number;
  peakVu: number;
  platform: string;
  ptt1KeyName: string;
  ptt2KeyName: string;
  isWindowFullscreen: boolean;
  isWindowMaximised: boolean;
  showExpandedRxInfo: boolean;
  hasPtt1BeenSetDuringSetup: boolean;
  hasPtt2BeenSetDuringSetup: boolean;
  isEditMode: boolean;
  pendingRestart: boolean;
  transparentMiniMode: boolean;
  isAutoConnectMode: boolean;
  time: Date;
  setIsEditMode: (isEditMode: boolean) => void;
  setPtt1KeyName: (ptt1KeyName: string) => void;
  setPtt2KeyName: (ptt2KeyName: string) => void;
  updateVu: (vu: number, peakVu: number) => void;
  updatePlatform: (platform: string) => void;
  updatePtt1KeySet: (hasPtt1BeenSetDuringSetup: boolean) => void;
  updatePtt2KeySet: (hasPtt2BeenSetDuringSetup: boolean) => void;
  setWindowFullscreen: (fullscreen: boolean) => void;
  setWindowMaximised: (maximised: boolean) => void;
  setShowExpandedRxInfo: (showExpandedRxInfo: boolean) => void;
  setTransparentMiniMode: (transparentMiniMode: boolean) => void;
  setPendingRestart: (pendingRestart: boolean) => void;
  setTime: (time: Date) => void;
  setIsAutoConnectMode: (isAutoConnectMode: boolean) => void;
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
  isAutoConnectMode: false,
  showExpandedRxInfo: false,
  isEditMode: false,
  transparentMiniMode: false,
  pendingRestart: false,
  time: new Date(),
  setIsEditMode: (isEditMode: boolean) => {
    set({ isEditMode });
  },
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
  },
  setShowExpandedRxInfo: (showExpandedRxInfo: boolean): void => {
    set({ showExpandedRxInfo });
  },
  setTransparentMiniMode: (transparentMiniMode: boolean): void => {
    set({ transparentMiniMode });
  },
  setPendingRestart: (pendingRestart: boolean): void => {
    set({ pendingRestart });
  },
  setTime(time: Date): void {
    set({ time });
  },
  setIsAutoConnectMode: (isAutoConnectMode: boolean): void => {
    set({ isAutoConnectMode });
  }
}));

export default useUtilStore;

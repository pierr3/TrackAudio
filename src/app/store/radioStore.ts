import { create } from "zustand";

export type RadioType = {
  frequency: number;
  callsign: string;
  rx: boolean;
  tx: boolean;
  xc: boolean;
  currentlyTx: boolean;
  currentlyRx: boolean;
  onSpeaker: boolean;
  selected: boolean;
  transceiverCount: number;
};

type RadioState = {
  radios: RadioType[];
  addRadio: (frequency: number, callsign: string) => void;
  removeRadio: (frequency: number) => void;
  setRx: (frequency: number, value: boolean) => void;
  setTx: (frequency: number, value: boolean) => void;
  setXc: (frequency: number, value: boolean) => void;
  setCurrentlyTx: (frequency: number, value: boolean) => void;
  setCurrentlyRx: (frequency: number, value: boolean) => void;
  setOnSpeaker: (frequency: number, value: boolean) => void;
  selectRadio: (frequency: number) => void;
  getSelectedRadio: () => RadioType | undefined;
  isRadioUnique: (frequency: number) => boolean;
};

export class RadioHelper {
  static getRadioIndex(radios: RadioType[], frequency: number): number {
    return radios.findIndex((radio) => radio.frequency === frequency);
  }

  static doesRadioExist(radios: RadioType[], frequency: number): boolean {
    return this.getRadioIndex(radios, frequency) !== -1;
  }

  static convertHzToMHz(hz: number): number {
    return hz / 1000000;
  }

  static convertMHzToHz(mhz: number): number {
    return mhz * 1000000;
  }

  static convertHzToMhzString(hz: number): string {
    return `${this.convertHzToMHz(hz).toFixed(3)}`;
  }
}

const useRadioState = create<RadioState>((set) => ({
  radios: [],
  addRadio: (frequency, callsign) => {
    if (
      !RadioHelper.doesRadioExist(useRadioState.getState().radios, frequency)
    ) {
      set((state) => ({
        radios: [
          ...state.radios,
          {
            frequency,
            callsign,
            rx: false,
            tx: false,
            xc: false,
            currentlyTx: false,
            currentlyRx: false,
            onSpeaker: false,
            selected: false,
            transceiverCount: 0,
          },
        ],
      }));
    }
  },
  removeRadio: (frequency) => {
    set((state) => ({
      radios: state.radios.filter((radio) => radio.frequency !== frequency),
    }));
  },
  setRx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, rx: value } : radio
      ),
    }));
  },
  setTx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, tx: value } : radio
      ),
    }));
  },
  setXc: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, xc: value } : radio
      ),
    }));
  },
  setCurrentlyTx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, currentlyTx: value } : radio
      ),
    }));
  },
  setCurrentlyRx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, currentlyRx: value } : radio
      ),
    }));
  },
  setOnSpeaker: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, onSpeaker: value } : radio
      ),
    }));
  },
  selectRadio: (frequency) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? { ...radio, selected: true }
          : { ...radio, selected: false }
      ),
    }));
  },
  getSelectedRadio: (): RadioType | undefined => {
    const selectedRadio = useRadioState.getState().radios.find(
      (radio) => radio.selected
    );
    return selectedRadio;
  },
  isRadioUnique: (frequency): boolean => {
    return !RadioHelper.doesRadioExist(useRadioState.getState().radios, frequency);
  },
}));

export default useRadioState;

import { create } from "zustand";
import useSessionStore from "./sessionStore";
import { radioCompare } from "../helpers/RadioHelper";
import { getCallsignParts } from "../helpers/CallsignHelper";

export interface RadioType {
  frequency: number;
  callsign: string;
  rx: boolean;
  tx: boolean;
  xc: boolean;
  crossCoupleAcross: boolean;
  currentlyTx: boolean;
  currentlyRx: boolean;
  onSpeaker: boolean;
  selected: boolean;
  transceiverCount: number;
  lastReceivedCallsign?: string;
  lastReceivedCallsignHistory?: string[];
  station: string;
  position: string;
  subPosition: string;
}

interface RadioState {
  radios: RadioType[];
  pttIsOn: boolean;
  addRadio: (
    frequency: number,
    callsign: string,
    stationCallsign: string,
  ) => void;
  removeRadio: (frequency: number) => void;
  setRx: (frequency: number, value: boolean) => void;
  setTx: (frequency: number, value: boolean) => void;
  setXc: (frequency: number, value: boolean) => void;
  setCrossCoupleAcross: (frequency: number, value: boolean) => void;
  setCurrentlyTx: (value: boolean) => void;
  setCurrentlyRx: (frequency: number, value: boolean) => void;
  setOnSpeaker: (frequency: number, value: boolean) => void;
  selectRadio: (frequency: number) => void;
  getSelectedRadio: () => RadioType | undefined;
  isRadioUnique: (frequency: number) => boolean;
  isInactive: (frequency: number) => boolean;
  setLastReceivedCallsign(frequency: number, callsign: string): void;
  setTransceiverCountForStationCallsign: (
    callsign: string,
    count: number,
  ) => void;
  reset: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
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
    return this.convertHzToMHz(hz).toFixed(3);
  }
}

const useRadioState = create<RadioState>((set) => ({
  radios: [],
  pttIsOn: false,
  addRadio: (frequency, callsign, stationCallsign) => {
    if (
      RadioHelper.doesRadioExist(useRadioState.getState().radios, frequency)
    ) {
      postMessage(
        "Frequency already exists in local client, but maybe not in AFV, delete it and try again",
      );
      return;
    }

    const [station, position, subPosition] = getCallsignParts(callsign);

    set((state) => ({
      radios: [
        ...state.radios,
        {
          frequency,
          callsign,
          station,
          position,
          subPosition,
          rx: false,
          tx: false,
          xc: false,
          crossCoupleAcross: false,
          currentlyTx: false,
          currentlyRx: false,
          onSpeaker: false,
          selected: false,
          transceiverCount: 0,
        },
      ].sort((a, b) => radioCompare(a, b, stationCallsign)),
    }));
  },
  removeRadio: (frequency) => {
    set((state) => ({
      radios: state.radios.filter((radio) => radio.frequency !== frequency),
    }));
  },
  setRx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? {
              ...radio,
              rx: value,
              tx: value ? radio.tx : false,
              xc: value ? radio.xc : false,
              currentlyRx: value ? radio.currentlyRx : false,
              currentlyTx: value ? radio.currentlyTx : false,
            }
          : radio,
      ),
    }));
  },
  setTx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? {
              ...radio,
              tx: value,
              rx: value && !radio.rx ? true : radio.rx,
              currentlyTx: value ? radio.currentlyTx : false,
            }
          : radio,
      ),
    }));
  },
  setXc: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, xc: value } : radio,
      ),
    }));
  },
  setCurrentlyRx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? { ...radio, currentlyRx: value }
          : radio,
      ),
    }));
  },
  setOnSpeaker: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, onSpeaker: value } : radio,
      ),
    }));
  },
  selectRadio: (frequency) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? { ...radio, selected: true }
          : { ...radio, selected: false },
      ),
    }));
  },
  getSelectedRadio: (): RadioType | undefined => {
    const selectedRadio = useRadioState
      .getState()
      .radios.find((radio) => radio.selected);
    return selectedRadio;
  },
  isRadioUnique: (frequency): boolean => {
    return !RadioHelper.doesRadioExist(
      useRadioState.getState().radios,
      frequency,
    );
  },
  setLastReceivedCallsign: (frequency, callsign) => {
    if (callsign === useSessionStore.getState().stationCallsign) {
      return; // Ignore our transmissions
    }
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? {
              ...radio,
              lastReceivedCallsign: callsign,
              lastReceivedCallsignHistory: radio.lastReceivedCallsign
                ? [
                    ...(radio.lastReceivedCallsignHistory ?? []),
                    radio.lastReceivedCallsign,
                  ].slice(-5) // Ensure maximum of 5 values in the array
                : radio.lastReceivedCallsignHistory,
            }
          : radio,
      ),
    }));
  },
  reset: () => {
    set(() => ({
      radios: [],
    }));
  },
  setTransceiverCountForStationCallsign: (callsign, count) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.callsign === callsign
          ? { ...radio, transceiverCount: count }
          : radio,
      ),
    }));
  },
  setCurrentlyTx: (value) => {
    set((state) => ({
      pttIsOn: value,
      radios: state.radios.map((radio) =>
        radio.tx ? { ...radio, currentlyTx: value } : radio,
      ),
    }));
  },
  isInactive: (frequency): boolean => {
    const radio = useRadioState
      .getState()
      .radios.find((radio) => radio.frequency === frequency);
    return radio ? !radio.rx && !radio.tx : true;
  },
  setCrossCoupleAcross: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? { ...radio, crossCoupleAcross: value }
          : radio,
      ),
    }));
  },
}));

export default useRadioState;

import { create } from 'zustand';
import useSessionStore from './sessionStore';
import { radioCompare } from '../helpers/RadioHelper';
import { getCallsignParts } from '../helpers/CallsignHelper';
import { GuardFrequency, UnicomFrequency } from '../../../shared/common';
import { Station } from '@renderer/interfaces/Station';

export interface RadioType {
  frequency: number;
  frequencyAlias?: number;
  humanFrequency: string;
  humanFrequencyAlias?: string;
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
  lastReceivedCallsigns: string[];
  lastReceivedCallsignHistory?: string[];
  station: string;
  position: string;
  subPosition: string;
  isPendingDeleting: boolean;
  outputVolume: number;
  isOutputMuted: boolean;
}

export interface FrequencyState {
  rx: boolean;
  tx: boolean;
  xc: boolean;
  crossCoupleAcross: boolean;
  onSpeaker: boolean;
  outputVolume: number;
  isOutputMuted: boolean;
}

interface RadioState {
  radios: RadioType[];
  radiosSelected: RadioType[];
  pttIsOn: boolean;
  showingUnicomBar: boolean;
  addRadioByStation: (radio: Station, stationCallsign: string) => void;
  addRadio: (frequency: number, callsign: string, stationCallsign: string) => void;
  removeRadio: (frequency: number) => void;
  setRadioState: (frequency: number, frequencyState: FrequencyState) => void;
  setCurrentlyTx: (value: boolean) => void;
  setCurrentlyRx: (frequency: number, value: boolean) => void;
  setOutputVolume: (frequency: number, volume: number) => void;
  selectRadio: (frequency: number) => void;
  getSelectedRadio: () => RadioType | undefined;
  isRadioUnique: (frequency: number) => boolean;
  isInactive: (frequency: number) => boolean;
  getLastReceivedCallsigns: (frequency: number) => string[];
  setLastReceivedCallsigns(frequency: number, callsigns: string[]): void;
  setTransceiverCountForStationCallsign: (callsign: string, count: number) => void;
  setPendingDeletion: (frequency: number, value: boolean) => void;
  reset: () => void;
  addOrRemoveRadioToBeDeleted: (radio: RadioType) => void;
  clearRadiosToBeDeleted: () => void;
  getRadioByFrequency: (frequency: number) => RadioType | undefined;
  setShowingUnicomBar: (value: boolean) => void;
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

const useRadioState = create<RadioState>((set, get) => ({
  radios: [],
  radiosSelected: [],
  pttIsOn: false,
  showingUnicomBar: false,

  setShowingUnicomBar: (value) => {
    set(() => ({
      showingUnicomBar: value
    }));
  },
  addRadio: (frequency, callsign, stationCallsign) => {
    if (get().getRadioByFrequency(frequency)) {
      if (frequency !== UnicomFrequency && frequency !== GuardFrequency) {
        postMessage(
          'Frequency already exists in local client, but maybe not in AFV, delete it and try again'
        );
      }
      return;
    }

    const [station, position, subPosition] = getCallsignParts(callsign);

    set((state) => ({
      radios: [
        ...state.radios,
        {
          frequency,
          humanFrequency: RadioHelper.convertHzToMhzString(frequency),
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
          isPendingDeleting: false,
          outputVolume: 100,
          isOutputMuted: false,
          lastReceivedCallsigns: []
        }
      ].sort((a, b) => radioCompare(a, b, stationCallsign))
    }));
  },
  addRadioByStation: (radio: Station, stationCallsign: string) => {
    const { frequency, name: callsign, frequencyAlias } = radio;

    if (RadioHelper.doesRadioExist(useRadioState.getState().radios, frequency)) {
      if (frequency !== UnicomFrequency && frequency !== GuardFrequency) {
        postMessage(
          'Frequency already exists in local client, but maybe not in AFV, delete it and try again'
        );
      }
      return;
    }

    const [station, position, subPosition] = getCallsignParts(callsign);

    const humanFrequencyAlias = frequencyAlias
      ? RadioHelper.convertHzToMhzString(frequencyAlias)
      : undefined;

    set((state) => ({
      radios: [
        ...state.radios,
        {
          frequency,
          frequencyAlias,
          humanFrequencyAlias,
          humanFrequency: RadioHelper.convertHzToMhzString(frequency),
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
          isPendingDeleting: false,
          outputVolume: 100,
          isOutputMuted: false,
          lastReceivedCallsigns: []
        }
      ].sort((a, b) => radioCompare(a, b, stationCallsign))
    }));
  },
  addOrRemoveRadioToBeDeleted: (radio) => {
    if (useRadioState.getState().radiosSelected.some((r) => r.frequency === radio.frequency)) {
      set((state) => ({
        radiosSelected: state.radiosSelected.filter((r) => r.frequency !== radio.frequency)
      }));
    } else {
      set((state) => ({
        radiosSelected: [...state.radiosSelected, radio]
      }));
    }
  },
  clearRadiosToBeDeleted: () => {
    set(() => ({
      radiosSelected: []
    }));
  },
  removeRadio: (frequency) => {
    set((state) => ({
      radios: state.radios.filter((radio) => radio.frequency !== frequency)
    }));
  },
  selectRadio: (frequency) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, selected: true } : { ...radio, selected: false }
      )
    }));
  },
  getSelectedRadio: (): RadioType | undefined => {
    const selectedRadio = useRadioState.getState().radios.find((radio) => radio.selected);
    return selectedRadio;
  },
  isRadioUnique: (frequency): boolean => {
    return !RadioHelper.doesRadioExist(useRadioState.getState().radios, frequency);
  },

  setLastReceivedCallsigns: (frequency, callsigns) => {
    if (callsigns.includes(useSessionStore.getState().stationCallsign)) {
      return; // Ignore our transmissions
    }
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? {
              ...radio,
              lastReceivedCallsigns: callsigns,
              lastReceivedCallsignHistory: [
                ...(radio.lastReceivedCallsignHistory ?? []),
                ...callsigns
              ].slice(-5)
            }
          : radio
      )
    }));
  },
  getLastReceivedCallsigns: (frequency: number): string[] => {
    const radio = useRadioState.getState().radios.find((radio) => radio.frequency === frequency);
    return radio ? radio.lastReceivedCallsigns : [];
  },
  reset: () => {
    set(() => ({
      radios: [],
      radiosSelected: []
    }));
  },
  setTransceiverCountForStationCallsign: (callsign, count) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.callsign === callsign ? { ...radio, transceiverCount: count } : radio
      )
    }));
  },
  setCurrentlyTx: (value) => {
    set((state) => ({
      pttIsOn: value,
      radios: state.radios.map((radio) => (radio.tx ? { ...radio, currentlyTx: value } : radio))
    }));
  },
  isInactive: (frequency): boolean => {
    const radio = useRadioState.getState().radios.find((radio) => radio.frequency === frequency);
    return radio ? !radio.rx && !radio.tx : true;
  },
  setPendingDeletion: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, isPendingDeleting: value } : radio
      )
    }));
  },
  setCurrentlyRx: (frequency, value) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, currentlyRx: value } : radio
      )
    }));
  },
  setOutputVolume: (frequency, volume) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency ? { ...radio, outputVolume: volume } : radio
      )
    }));
  },
  getRadioByFrequency: (frequency) => {
    return get().radios.find((radio) => radio.frequency === frequency);
  },
  setRadioState: (frequency, frequencyState) => {
    set((state) => ({
      radios: state.radios.map((radio) =>
        radio.frequency === frequency
          ? {
              ...radio,
              rx: frequencyState.rx,
              tx: frequencyState.tx,
              xc: frequencyState.xc,
              crossCoupleAcross: frequencyState.crossCoupleAcross,
              onSpeaker: frequencyState.onSpeaker,
              currentlyRx: frequencyState.rx ? radio.currentlyRx : false,
              currentlyTx: frequencyState.tx ? radio.currentlyTx : false,
              outputVolume: frequencyState.outputVolume,
              isOutputMuted: frequencyState.isOutputMuted
            }
          : radio
      )
    }));
  }
}));

export default useRadioState;

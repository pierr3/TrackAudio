import React, { useEffect } from 'react';
import useRadioState from '../store/radioStore';
import useErrorStore from '../store/errorStore';
import useSessionStore from '../store/sessionStore';
import useUtilStore from '../store/utilStore';
import { StationStateUpdate } from '../interfaces/StationStateUpdate';
import { Configuration } from 'src/shared/config.type';

const Bootsrap: React.FC = () => {
  useEffect(() => {
    void window.api.RequestPttKeyName(1);
    void window.api.RequestPttKeyName(2);

    window.api.window.checkIsFullscreen();

    window.api
      .getConfig()
      .then((config: Configuration) => {
        useUtilStore.getState().setShowExpandedRxInfo(config.showExpandedRx);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    window.api.on('VuMeter', (vu: string, peakVu: string) => {
      const vuFloat = Math.abs(parseFloat(vu));
      const peakVuFloat = Math.abs(parseFloat(peakVu));

      // Convert to a scale of 0 - 100
      useUtilStore.getState().updateVu(vuFloat * 100, peakVuFloat * 100);
    });

    window.api.on('station-transceivers-updated', (station: string, count: string) => {
      useRadioState.getState().setTransceiverCountForStationCallsign(station, parseInt(count));
    });

    window.api.on('station-data-received', (station: string, frequency: string) => {
      const freq = parseInt(frequency);
      window.api
        .addFrequency(freq, station)
        .then((ret) => {
          if (!ret) {
            console.error('Failed to add frequency', freq, station);
            return;
          }
          useRadioState
            .getState()
            .addRadio(freq, station, useSessionStore.getState().getStationCallsign());
          void window.api.SetRadioGain(useSessionStore.getState().radioGain / 100);
        })
        .catch((err: unknown) => {
          console.error(err);
        });
    });

    // Received when a station's state is updated externally, typically
    // by another client via a websocket message. When received go through
    // and ensure the state of the button in TrackAudio matches the new
    // state in AFV.
    window.api.on('station-state-update', (data: string) => {
      const update = JSON.parse(data) as StationStateUpdate;

      const radio = useRadioState
        .getState()
        .radios.find((radio) => radio.frequency === update.value.frequency);

      if (!radio) {
        return;
      }

      useRadioState.getState().setRadioState(radio.frequency, {
        rx: update.value.rx,
        tx: update.value.tx,
        xc: update.value.xc,
        crossCoupleAcross: update.value.xca,
        onSpeaker: !update.value.headset
      });
    });

    window.api.on('FrequencyRxBegin', (frequency: string) => {
      if (useRadioState.getState().isInactive(parseInt(frequency))) {
        return;
      }

      useRadioState.getState().setCurrentlyRx(parseInt(frequency), true);
    });

    window.api.on('StationRxBegin', (frequency: string, callsign: string) => {
      if (useRadioState.getState().isInactive(parseInt(frequency))) {
        return;
      }

      useRadioState.getState().setLastReceivedCallsign(parseInt(frequency), callsign);
    });

    window.api.on('FrequencyRxEnd', (frequency: string) => {
      if (useRadioState.getState().isInactive(parseInt(frequency))) {
        return;
      }

      useRadioState.getState().setCurrentlyRx(parseInt(frequency), false);
    });

    window.api.on('PttState', (state) => {
      const pttState = state === '1' ? true : false;
      useRadioState.getState().setCurrentlyTx(pttState);
    });

    window.api.on('error', (message: string) => {
      useErrorStore.getState().postError(message);
    });

    window.api.on('VoiceConnected', () => {
      useSessionStore.getState().setIsConnecting(false);
      useSessionStore.getState().setIsConnected(true);
      if (useSessionStore.getState().isAtc) {
        void window.api.GetStation(useSessionStore.getState().stationCallsign);
      }
    });

    window.api.on('VoiceDisconnected', () => {
      useSessionStore.getState().setIsConnecting(false);
      useSessionStore.getState().setIsConnected(false);
      useRadioState.getState().reset();
      useUtilStore.getState().setIsEditMode(false);
    });

    window.api.on('network-connected', (callsign: string, dataString: string) => {
      useSessionStore.getState().setNetworkConnected(true);
      useSessionStore.getState().setCallsign(callsign);
      const dataArr = dataString.split(',');
      const isAtc = dataArr[0] === '1';
      const frequency = parseInt(dataArr[1]);
      useSessionStore.getState().setIsAtc(isAtc);
      useSessionStore.getState().setFrequency(frequency);
    });

    window.api.on('network-disconnected', () => {
      useSessionStore.getState().setNetworkConnected(false);
      useSessionStore.getState().setCallsign('');
      useSessionStore.getState().setIsAtc(false);
      useSessionStore.getState().setFrequency(199998000);
    });

    window.api.on('ptt-key-set', (pttIndex: string, key: string) => {
      const index = parseInt(pttIndex);

      if (index == 1) {
        useUtilStore.getState().updatePtt1KeySet(true);
        useUtilStore.getState().setPtt1KeyName(key);
      } else if (index == 2) {
        useUtilStore.getState().updatePtt2KeySet(true);
        useUtilStore.getState().setPtt2KeyName(key);
      }
    });

    window.api
      .UpdatePlatform()
      .then((platform: string) => {
        useUtilStore.getState().updatePlatform(platform);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    window.api
      .getVersion()
      .then((version: string) => {
        useSessionStore.getState().setVersion(version);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    return () => {
      window.api.removeAllListeners('VuMeter');
      window.api.removeAllListeners('station-transceivers-updated');
      window.api.removeAllListeners('station-data-received');
      window.api.removeAllListeners('FrequencyRxBegin');
      window.api.removeAllListeners('StationRxBegin');
      window.api.removeAllListeners('FrequencyRxEnd');
      window.api.removeAllListeners('PttState');
      window.api.removeAllListeners('error');
      window.api.removeAllListeners('VoiceConnected');
      window.api.removeAllListeners('VoiceDisconnected');
      window.api.removeAllListeners('network-connected');
      window.api.removeAllListeners('network-disconnected');
      window.api.removeAllListeners('ptt-key-set');
    };
  }, []);

  return null;
};

export default Bootsrap;

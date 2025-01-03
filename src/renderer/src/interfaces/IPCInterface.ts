import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import { Configuration } from 'src/shared/config.type';
import { StationStateUpdate } from './StationStateUpdate';
import useErrorStore from '@renderer/store/errorStore';
import { MainOutputVolumeChange } from 'src/shared/MainOutputVolumeChange';

class IPCInterface {
  public init() {
    const utilStoreState = useUtilStore.getState();
    const radioStoreState = useRadioState.getState();
    const sessionStoreState = useSessionStore.getState();
    const errorStoreState = useErrorStore.getState();

    void window.api.RequestPttKeyName(1);
    void window.api.RequestPttKeyName(2);

    window.api.window.checkIsFullscreen();

    window.api
      .getConfig()
      .then((config: Configuration) => {
        utilStoreState.setShowExpandedRxInfo(config.showExpandedRx);
        utilStoreState.setTransparentMiniMode(config.transparentMiniMode);
      })
      .catch((err: unknown) => {
        window.api.log.error(err as string);
      });

    window.api.on('VuMeter', (vu: string, peakVu: string) => {
      const vuFloat = Math.abs(parseFloat(vu));
      const peakVuFloat = Math.abs(parseFloat(peakVu));

      // Convert to a scale of 0 - 100
      utilStoreState.updateVu(vuFloat * 100, peakVuFloat * 100);
    });

    window.api.on('station-transceivers-updated', (station: string, count: string) => {
      radioStoreState.setTransceiverCountForStationCallsign(station, parseInt(count));
    });

    window.api.on('station-data-received', (station: string, frequency: string) => {
      const freq = parseInt(frequency);
      window.api
        .addFrequency(freq, station)
        .then((ret) => {
          if (!ret) {
            window.api.log.error(
              `Failed to add frequency ${freq.toString()} for station ${station}`
            );
            return;
          }
          radioStoreState.addRadio(freq, station, sessionStoreState.getStationCallsign());
          void window.api.SetMainRadioVolume(sessionStoreState.mainRadioVolume);
        })
        .catch((err: unknown) => {
          window.api.log.error(err as string);
        });
    });

    // Received when a station's state is updated externally, typically
    // by another client via a websocket message. When received go through
    // and ensure the state of the button in TrackAudio matches the new
    // state in AFV.
    window.api.on('station-state-update', (data: string) => {
      const update = JSON.parse(data) as StationStateUpdate;

      const radio = radioStoreState.getRadioByFrequency(update.value.frequency);

      if (!radio) {
        // We received an update for a frequency that we don't have a radio for, so we create one
        radioStoreState.addRadio(
          update.value.frequency,
          update.value.callsign ?? 'MANUAL',
          update.value.callsign ?? 'MANUAL'
        );
        window.api.log.warn(
          `Failed to find radio with frequency ${update.value.frequency.toString()}, creating one`
        );
      }

      radioStoreState.setRadioState(update.value.frequency, {
        rx: update.value.rx,
        tx: update.value.tx,
        xc: update.value.xc,
        crossCoupleAcross: update.value.xca,
        onSpeaker: !update.value.headset,
        outputVolume: update.value.outputVolume,
        isOutputMuted: update.value.isOutputMuted
      });
    });

    window.api.on('main-output-volume-change', (data: string) => {
      const change = JSON.parse(data) as MainOutputVolumeChange;
      sessionStoreState.setMainRadioVolume(change.value.volume);
    });

    window.api.on('FrequencyRxBegin', (frequency: string) => {
      if (radioStoreState.isInactive(parseInt(frequency))) {
        return;
      }

      radioStoreState.setCurrentlyRx(parseInt(frequency), true);
    });

    window.api.on('StationRxBegin', (frequency: string, lastRx: string) => {
      if (radioStoreState.isInactive(parseInt(frequency))) {
        return;
      }

      radioStoreState.setLastReceivedCallsigns(parseInt(frequency), [lastRx]);
    });

    window.api.on('StationRxEnd', (frequency: string, lastRx: string[]) => {
      if (radioStoreState.isInactive(parseInt(frequency))) {
        return;
      }

      radioStoreState.setLastReceivedCallsigns(parseInt(frequency), lastRx);
    });

    window.api.on('FrequencyRxEnd', (frequency: string) => {
      if (radioStoreState.isInactive(parseInt(frequency))) {
        return;
      }

      radioStoreState.setCurrentlyRx(parseInt(frequency), false);
    });

    window.api.on('PttState', (state) => {
      const pttState = state === '1' ? true : false;
      radioStoreState.setCurrentlyTx(pttState);
    });

    window.api.on('error', (message: string) => {
      errorStoreState.postError(message);
    });

    window.api.on('VoiceConnected', () => {
      sessionStoreState.setIsConnecting(false);
      sessionStoreState.setIsConnected(true);
      if (sessionStoreState.getIsAtc()) {
        void window.api.GetStation(sessionStoreState.getStationCallsign());
      }
    });

    window.api.on('VoiceDisconnected', () => {
      sessionStoreState.setIsConnecting(false);
      sessionStoreState.setIsConnected(false);
      radioStoreState.reset();
      utilStoreState.setIsEditMode(false);
    });

    window.api.on('network-connected', (callsign: string, dataString: string) => {
      sessionStoreState.setNetworkConnected(true);
      sessionStoreState.setCallsign(callsign);
      const dataArr = dataString.split(',');
      const isAtc = dataArr[0] === '1';
      const frequency = parseInt(dataArr[1]);
      sessionStoreState.setIsAtc(isAtc);
      sessionStoreState.setFrequency(frequency);
    });

    window.api.on('network-disconnected', () => {
      sessionStoreState.setNetworkConnected(false);
      sessionStoreState.setCallsign('');
      sessionStoreState.setIsAtc(false);
      sessionStoreState.setFrequency(199998000);
    });

    window.api.on('ptt-key-set', (pttIndex: string, key: string) => {
      const index = parseInt(pttIndex);

      if (index == 1) {
        utilStoreState.updatePtt1KeySet(true);
        utilStoreState.setPtt1KeyName(key);
      } else if (index == 2) {
        utilStoreState.updatePtt2KeySet(true);
        utilStoreState.setPtt2KeyName(key);
      }
    });

    window.api
      .UpdatePlatform()
      .then((platform: string) => {
        utilStoreState.updatePlatform(platform);
      })
      .catch((err: unknown) => {
        window.api.log.error(err as string);
      });

    window.api
      .getVersion()
      .then((version: string) => {
        sessionStoreState.setVersion(version);
      })
      .catch((err: unknown) => {
        window.api.log.error(err as string);
      });
  }

  public destroy() {
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
    window.api.removeAllListeners('station-state-update');
    window.api.removeAllListeners('main-output-volume-change');
  }
}

export default new IPCInterface();

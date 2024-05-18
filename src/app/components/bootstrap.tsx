import React, { useEffect } from "react";
import useRadioState from "../store/radioStore";
import useErrorStore from "../store/errorStore";
import useSessionStore from "../store/sessionStore";
import useUtilStore from "../store/utilStore";
import { StationStateUpdate } from "../interfaces/StationStateUpdate";

const Bootsrap: React.FC = () => {
  useEffect(() => {
    void window.api.RequestPttKeyName();

    window.api.on("VuMeter", (vu: string, peakVu: string) => {
      const vuFloat = Math.abs(parseFloat(vu));
      const peakVuFloat = Math.abs(parseFloat(peakVu));

      // Convert to a scale of 0 - 100
      useUtilStore.getState().updateVu(vuFloat * 100, peakVuFloat * 100);
    });

    window.api.on(
      "station-transceivers-updated",
      (station: string, count: string) => {
        useRadioState
          .getState()
          .setTransceiverCountForStationCallsign(station, parseInt(count));
      }
    );

    window.api.on(
      "station-data-received",
      (station: string, frequency: string) => {
        const freq = parseInt(frequency);
        window.api
          .addFrequency(freq, station)
          .then((ret) => {
            if (!ret) {
              console.error("Failed to add frequency", freq, station);
              return;
            }
            useRadioState
              .getState()
              .addRadio(
                freq,
                station,
                useSessionStore.getState().getStationCallsign()
              );
            void window.api.SetRadioGain(
              useSessionStore.getState().radioGain / 100
            );
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      }
    );

    window.api.on("FrequencyRxBegin", (frequency: string) => {
      if (useRadioState.getState().isInactive(parseInt(frequency))) {
        return;
      }

      useRadioState.getState().setCurrentlyRx(parseInt(frequency), true);
    });

    window.api.on("StationRxBegin", (frequency: string, callsign: string) => {
      if (useRadioState.getState().isInactive(parseInt(frequency))) {
        return;
      }

      useRadioState
        .getState()
        .setLastReceivedCallsign(parseInt(frequency), callsign);
    });

    window.api.on("FrequencyRxEnd", (frequency: string) => {
      if (useRadioState.getState().isInactive(parseInt(frequency))) {
        return;
      }

      useRadioState.getState().setCurrentlyRx(parseInt(frequency), false);
    });

    window.api.on("PttState", (state) => {
      const pttState = state === "1" ? true : false;
      useRadioState.getState().setCurrentlyTx(pttState);
    });

    window.api.on("error", (message: string) => {
      useErrorStore.getState().postError(message);
    });

    window.api.on("VoiceConnected", () => {
      useSessionStore.getState().setIsConnecting(false);
      useSessionStore.getState().setIsConnected(true);
      if (useSessionStore.getState().isAtc) {
        void window.api.GetStation(useSessionStore.getState().stationCallsign);
      }
    });

    window.api.on("VoiceDisconnected", () => {
      useSessionStore.getState().setIsConnecting(false);
      useSessionStore.getState().setIsConnected(false);
      useRadioState.getState().reset();
    });

    window.api.on(
      "network-connected",
      (callsign: string, dataString: string) => {
        useSessionStore.getState().setNetworkConnected(true);
        useSessionStore.getState().setCallsign(callsign);
        const dataArr = dataString.split(",");
        const isAtc = dataArr[0] === "1";
        const frequency = parseInt(dataArr[1]);
        useSessionStore.getState().setIsAtc(isAtc);
        useSessionStore.getState().setFrequency(frequency);
      }
    );

    window.api.on("network-disconnected", () => {
      useSessionStore.getState().setNetworkConnected(false);
      useSessionStore.getState().setCallsign("");
      useSessionStore.getState().setIsAtc(false);
      useSessionStore.getState().setFrequency(199998000);
    });

    window.api.on("station-state-update", (data: string) => {
      console.log(data);
    });

    // Received when a station's state is updated externally, typically
    // by another client via a websocket message. When received go through
    // and ensure the state of the button in TrackAudio matches the new
    // state in AFV.
    window.api.on("station-state-update", (data: string) => {
      const update = JSON.parse(data) as StationStateUpdate;

      useRadioState
        .getState()
        .radios.filter((radio) => radio.frequency === update.value.frequency)
        .forEach((radio) => {
          // Only update if the state has changed
          if (update.value.rx != radio.rx) {
            useRadioState.getState().setRx(radio.frequency, update.value.rx);
          }
          if (update.value.tx != radio.tx) {
            useRadioState.getState().setTx(radio.frequency, update.value.tx);
          }
          if (update.value.xc != radio.xc) {
            useRadioState.getState().setXc(radio.frequency, update.value.xc);
          }
          // The funky != ! is because onSpeaker represents the inverse
          // of the headset state. Yes, it could be == but this makes it
          // follow the pattern of the previous tests.
          if (update.value.headset != !radio.onSpeaker) {
            useRadioState
              .getState()
              .setOnSpeaker(radio.frequency, !update.value.headset);
          }
        });
    });

    window.api.on("ptt-key-set", (key: string) => {
      useUtilStore.getState().updatePttKeySet(true);
      useUtilStore.getState().setPttKeyName(key);
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
  }, []);

  return null;
};

export default Bootsrap;

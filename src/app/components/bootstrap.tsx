import React, { useEffect } from "react";
import useRadioState from "../store/radioStore";
import useErrorStore from "../store/errorStore";
import useSessionStore from "../store/sessionStore";
import useUtilStore from "../store/utilStore";

const Bootsrap: React.FC = () => {
  useEffect(() => {
    window.api.on("MicTest", (vu, peakVu) => {
      const vuFloat = Math.abs(parseFloat(vu));
      const peakVuFloat = Math.abs(parseFloat(peakVu));

      // Convert to a scale of 0 - 100
      useUtilStore.getState().updateVu(vuFloat * 100, peakVuFloat * 100);
    });

    window.api.on("station-transceivers-updated", (station, count) => {
      useRadioState
        .getState()
        .setTransceiverCountForStationCallsign(station, parseInt(count));
    });

    window.api.on("station-data-received", (station, frequency) => {
      const freq = parseInt(frequency);
      window.api.addFrequency(freq, station).then((ret) => {
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
        window.api.SetRadioGain(useSessionStore.getState().radioGain / 100);
      });
    });

    window.api.on("FrequencyRxBegin", (frequency) => {
      useRadioState.getState().setCurrentlyRx(parseInt(frequency), true);
    });

    window.api.on("StationRxBegin", (frequency, callsign) => {
      useRadioState
        .getState()
        .setLastReceivedCallsign(parseInt(frequency), callsign);
    });

    window.api.on("FrequencyRxEnd", (frequency) => {
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
        window.api.GetStation(useSessionStore.getState().stationCallsign);
      }
    });

    window.api.on("VoiceDisconnected", () => {
      useSessionStore.getState().setIsConnecting(false);
      useSessionStore.getState().setIsConnected(false);
      useRadioState.getState().reset();
    });

    window.api.on("network-connected", (callsign, dataString) => {
      useSessionStore.getState().setNetworkConnected(true);
      useSessionStore.getState().setCallsign(callsign);
      const dataArr = dataString.split(",");
      const isAtc = dataArr[0] === "1";
      const frequency = parseInt(dataArr[1]);
      useSessionStore.getState().setIsAtc(isAtc);
      useSessionStore.getState().setFrequency(frequency);
    });

    window.api.on("network-disconnected", () => {
      useSessionStore.getState().setNetworkConnected(false);
      useSessionStore.getState().setCallsign("");
      useSessionStore.getState().setIsAtc(false);
      useSessionStore.getState().setFrequency(199998000);
    });

    window.api.on("ptt-key-set", (key) => {
      useSessionStore.getState().setPttKeyName(key);
    });

    window.api.UpdatePlatform().then((platform) => {
      useUtilStore.getState().updatePlatform(platform);
    });

    window.api.getVersion().then((version) => {
      useSessionStore.getState().setVersion(version);
    });
  }, []);

  return null;
};

export default Bootsrap;

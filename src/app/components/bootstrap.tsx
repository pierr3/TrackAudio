import React, { useEffect } from "react";
import useRadioState from "../store/radioStore";
import useErrorStore from "../store/errorStore";
import useSessionStore from "../store/sessionStore";

const Bootsrap: React.FC = () => {
  const [
    setTransceiverCountForStationCallsign,
    addRadio,
    setCurrentlyRx,
    setCurrentlyTx
  ] = useRadioState((state) => [
    state.setTransceiverCountForStationCallsign,
    state.addRadio,
    state.setCurrentlyRx,
    state.setCurrentlyTx,
  ]);

  const [
    setIsConnected,
    setIsConnecting,
    setVersion,
    setNetworkConnected,
    setCallsign,
    setFrequency,
    setIsAtc,
    setPttKeyName,
    setRadioGain,
    stationCallsign,
    isAtc
  ] = useSessionStore((state) => [
    state.setIsConnected,
    state.setIsConnecting,
    state.setVersion,
    state.setNetworkConnected,
    state.setCallsign,
    state.setFrequency,
    state.setIsAtc,
    state.setPttKeyName,
    state.setRadioGain,
    state.getStationCallsign,
    state.getIsAtc
  ]);

  const postError = useErrorStore((state) => state.postError);

  useEffect(() => {
    window.api.on("station-transceivers-updated", (station, count) => {
      console.log("station-transceivers-updated", station, count);
      setTransceiverCountForStationCallsign(station, parseInt(count));
    });

    window.api.on("station-data-received", (station, frequency) => {
      console.log("station-data-received", station, frequency);
      const freq = parseInt(frequency);
      window.api.addFrequency(freq, station).then((ret) => {
        if (!ret) {
          console.error("Failed to add frequency", freq, station);
          return;
        }
        addRadio(freq, station);
      });
    });

    window.api.on("FrequencyRxBegin", (frequency) => {
      setCurrentlyRx(parseInt(frequency), true);
    });

    window.api.on("FrequencyRxEnd", (frequency) => {
      setCurrentlyRx(parseInt(frequency), false);
    });

    window.api.on("PttState", (state) => {
      const pttState = state === "1" ? true : false;
      setCurrentlyTx(pttState);
    });

    window.api.on("error", (message: string) => {
      postError(message);
    });

    window.api.on("VoiceConnected", () => {
      setIsConnecting(false);
      setIsConnected(true);
      if (isAtc()) {
        window.api.GetStation(stationCallsign());
      }
    });

    window.api.on("VoiceDisconnected", () => {
      setRadioGain(50);
      setIsConnecting(false);
      setIsConnected(false);
    });

    window.api.on("network-connected", (callsign, dataString) => {
      setNetworkConnected(true);
      setCallsign(callsign);
      const dataArr = dataString.split(",");
      const isAtc = dataArr[0] === "1";
      const frequency = parseInt(dataArr[1]);
      setIsAtc(isAtc);
      setFrequency(frequency);
    });

    window.api.on("network-disconnected", () => {
      setNetworkConnected(false);
      setCallsign("");
      setIsAtc(false);
      setFrequency(199998000);
    });

    window.api.on("ptt-key-set", (key) => {
      setPttKeyName(key);
    });

    window.api.getVersion().then((version) => {
      setVersion(version);
    });
  }, []);

  return null;
};

export default Bootsrap;

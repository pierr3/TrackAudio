import React, { useEffect } from "react";
import useRadioState from "../store/radioStore";
import useErrorStore from "../store/errorStore";
import useSessionStore from "../store/sessionStore";

const Bootsrap: React.FC = () => {
  const [
    setTransceiverCountForStationCallsign,
    addRadio,
    setCurrentlyRx,
    setCurrentlyTx,
  ] = useRadioState((state) => [
    state.setTransceiverCountForStationCallsign,
    state.addRadio,
    state.setCurrentlyRx,
    state.setCurrentlyTx,
  ]);

  const [setIsConnected, setIsConnecting] = useSessionStore((state) => [
    state.setIsConnected,
    state.setIsConnecting,
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
          return;
        }
        addRadio(freq, station);
      });
    });

    window.api.on("FrequencyRxBegin", (frequency) => {
      console.log("Begin" + parseInt(frequency));
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
    });

    window.api.on("VoiceDisconnected", () => {
      setIsConnecting(false);
      setIsConnected(false);
    });
  }, []);

  return null;
};

export default Bootsrap;

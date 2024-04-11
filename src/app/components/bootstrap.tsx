import React, { useEffect } from "react";
import useRadioState from "../store/radioStore";
import useErrorStore from "../store/errorStore";

const Bootsrap: React.FC = () => {
  const [
    setTransceiverCountForStationCallsign,
    addRadio,
    setRx,
    setCurrentlyRx,
    setCurrentlyTx,
  ] = useRadioState((state) => [
    state.setTransceiverCountForStationCallsign,
    state.addRadio,
    state.setRx,
    state.setCurrentlyRx,
    state.setCurrentlyTx,
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
      addRadio(freq, station);
      setRx(freq, false);
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
  }, []);

  return null;
};

export default Bootsrap;

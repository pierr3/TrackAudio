import React, { useRef, useState } from "react";
import AddFrequency from "./add-frequency";
import RadioStatus from "./radio-status";
import useSessionStore from "../../store/sessionStore";
import useRadioState from "../../store/radioStore";

const Sidebar: React.FC = () => {
  const [readyToAdd, setReadyToAdd] = useState(false);
  const [version, isConnected] = useSessionStore((state) => [
    state.version,
    state.isConnected,
  ]);
  const [radios] = useRadioState((state) => [state.radios]);

  const stationInputRef = useRef<HTMLInputElement>(null);

  const addStation = () => {
    if (!readyToAdd || !isConnected) {
      return;
    }

    const callsign = stationInputRef.current?.value.toUpperCase();
    if (!callsign?.match(/^[A-Z0-9_ -]+$/) || !stationInputRef.current) {
      return;
    }

    void window.api.GetStation(callsign);
    stationInputRef.current.value = "";
    setReadyToAdd(false);
  };

  const lastReceivedCallsigns = radios
    .filter((radio) => radio.rx && radio.lastReceivedCallsign)
    .map((radio) => radio.lastReceivedCallsign)
    .join(",");

  return (
    <>
      <div className="box-container right-box hide-right-box">
        <div className="form-group">
          <label>Add a station</label>
          <input
            type="text"
            className="form-control mt-2"
            id="stationInput"
            placeholder="XXXX_XXX"
            ref={stationInputRef}
            onChange={(e) => {
              e.target.value.length !== 0
                ? setReadyToAdd(true)
                : setReadyToAdd(false);
            }}
            onKeyDown={(e) => {
              e.key === "Enter" && addStation();
            }}
          ></input>
          <button
            className="btn btn-primary mt-2 w-100"
            disabled={!readyToAdd || !isConnected}
            onClick={addStation}
          >
            Add
          </button>
        </div>

        <AddFrequency />

        {/* <span className="btn text-box-container mt-3 w-100">
          Source: Slurper
        </span> */}

        <div className="box-container mt-3 w-100">
          Last RX: {lastReceivedCallsigns}
        </div>

        <RadioStatus />

        <div className="box-container mt-3 w-100 licenses">
          {version} |&nbsp;
          <a
            href="https://github.com/pierr3/TrackAudio/blob/main/LICENSES_COMPILED.md"
            target="_blank"
            rel="noreferrer"
          >
            Licenses
          </a>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

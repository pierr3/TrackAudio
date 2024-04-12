import React, { useState } from "react";
import AddFrequency from "./add-frequency";
import RadioStatus from "./radio-status";
import useSessionStore from "../../store/sessionStore";

const Sidebar: React.FC = () => {
  const [readyToAdd, setReadyToAdd] = useState(false);
  const [version, isNetworkConnected] = useSessionStore((state) => [
    state.version,
    state.isNetworkConnected,
  ]);

  const addStation = () => {
    if (!readyToAdd) {
      return;
    }

    const stationInput = document.getElementById(
      "stationInput"
    ) as HTMLInputElement;
    const callsign = stationInput.value.toUpperCase();

    window.api.GetStation(callsign);
    stationInput.value = "";
    setReadyToAdd(false);
  };

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
            disabled={!readyToAdd || !isNetworkConnected}
            onClick={addStation}
          >
            Add
          </button>
        </div>

        <AddFrequency />

        <span className="btn text-box-container mt-3 w-100">
          Source: Slurper
        </span>

        <div className="box-container mt-3 w-100">Last RX: [TO BE ADDED]</div>

        <RadioStatus />

        <div className="box-container mt-3 w-100 licenses">
          Version: {version} |&nbsp;
          <a
            href="https://raw.githubusercontent.com/pierr3/VectorAudio/main/resources/LICENSE.txt"
            target="_blank"
          >
            Licenses
          </a>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

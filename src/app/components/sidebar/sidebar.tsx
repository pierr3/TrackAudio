import React from "react";
import AddFrequency from "./add-frequency";
import RadioStatus from "./radio-status";

const Sidebar: React.FC = () => {
  const addStation = () => {
    console.log("Add station");
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
          ></input>
          <button className="btn btn-primary mt-2 w-100" onClick={addStation}>
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
          Version: 1.0.0  |&nbsp;
          <a
            href="https://github.com/pierr3/VectorAudio/blob/main/resources/LICENSE.txt"
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

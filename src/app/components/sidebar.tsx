import React from "react";

const Sidebar: React.FC = () => {
  const addStation = () => {
    console.log("Add station");
  };

  const addFrequency = () => {
    console.log("Add frequency");
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

        <div className="form-group mt-3">
          <label>Add a frequency</label>
          <input
            type="number"
            className="form-control mt-2"
            id="frequencyInput"
            placeholder="118.000"
          ></input>
          <button className="btn btn-primary mt-2 w-100" onClick={addFrequency}>
            Add
          </button>
        </div>

        <span className="btn text-box-container mt-3 w-100">Source: Slurper</span>

        <div className="box-container mt-3 w-100">
            Last RX: AFR444, EWG222
        </div>

        <div className="box-container mt-3 w-100">
            Version: 1.0.0
            <br />
            <a href="https://github.com/pierr3/VectorAudio/blob/main/resources/LICENSE.txt" target="_blank">Licenses</a>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

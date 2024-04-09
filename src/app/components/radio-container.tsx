import React from "react";
import Radio from "./radio";

const RadioContainer: React.FC = () => {
  return (
    <>
      <div className="box-container freq-box">
        <div className="container">
          <div className="row">
            <Radio frequency={122.825} callsign={"LFPG_APP"} />
            <Radio frequency={125.525} callsign={"LFMN_ATIS"} />
            <Radio frequency={118.775} callsign={"LFKK_I_TWR"} />
          </div>
        </div>
      </div>
    </>
  );
};

export default RadioContainer;

import React from "react";

export type RadioProps = {
  frequency: number;
  callsign: string;
};

const Radio: React.FC<RadioProps> = ({ frequency, callsign }) => {

  const clickRx = () => {
    console.log("RX");
  };

  const clickTx = () => {
    console.log("TX");
  };

  const clickXc = () => {
    console.log("XX");
  };

  const clickSpK = () => {
    console.log("SPK");
  };

  return (
    <>
      <div className="col-4 radio">
        <div style={{ width: "48%", height: "45%", float: "left" }}>
          <button className="btn" style={{ height: "100%", marginBottom: "4%" }}>
            {frequency}
            <br/>
            {callsign}
          </button>
          <button
            className="btn btn-primary"
            style={{ width: "45%", height: "100%", marginTop: "4%" }}
            onClick={clickXc}
          >
            XC
          </button>
          <button
            className="btn btn-primary"
            style={{ width: "45%", height: "100%", marginTop: "4%", marginLeft: "10%"}}
            onClick={clickSpK}
          >
            SPK
          </button>
        </div>
        <div style={{ width: "48%", height: "45%", float: "right", marginLeft: "4%"}}>
          <button
            className="btn btn-success"
            style={{ width: "100%", height: "100%" }}
            onClick={clickRx}
          >
            RX
          </button>
          <button
            className="btn btn-warning"
            style={{ width: "100%", height: "100%", marginTop: "8%"}}
            onClick={clickTx}
          >
            TX
          </button>
        </div>
      </div>
    </>
  );
};

export default Radio;

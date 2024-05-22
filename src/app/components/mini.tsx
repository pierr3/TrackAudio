import React from "react";
import useRadioState from "../store/radioStore";

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);

  return (
    <div className="box-container mini">
      <div className="container">
        {radios
          .filter((r) => r.rx)
          .map((radio) => {
            return (
              <div key={radio.frequency}>
                <span
                  style={{ color: radio.currentlyTx ? "orange" : "inherit" }}
                >
                  {radio.callsign !== "MANUAL" ? radio.callsign : radio.humanFrequency}
                </span>
                :{" "}
                <span
                  style={{ color: radio.currentlyRx ? "green" : "inherit" }}
                >
                  {radio.lastReceivedCallsign ? radio.lastReceivedCallsign : ""}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Mini;

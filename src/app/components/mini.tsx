import React from "react";
import useRadioState from "../store/radioStore";

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);

  return (
    <div className="box-container mini">
      <div className="container">
        {radios.map((radio) => {
          if (radio.rx) {
            return (
              <div
                key={radio.frequency}
                style={{ color: radio.currentlyTx ? "orange" : "inherit" }}
              >
                {radio.callsign}:{" "}
                {radio.lastReceivedCallsign ? radio.lastReceivedCallsign : ""}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Mini;

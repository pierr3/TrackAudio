import React from "react";
import useRadioState from "../store/radioStore";

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);

  return (
    <div className="box-container mini">
      <div className="container">
        {radios.filter((r) => r.rx).map((radio) => {
            return (
              <div
                key={radio.frequency}
                style={{ color: radio.currentlyTx ? "orange" : "inherit" }}
              >
                {radio.callsign}:{" "}
                {radio.lastReceivedCallsign ? radio.lastReceivedCallsign : ""}
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default Mini;

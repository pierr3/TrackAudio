import React, { useEffect } from "react";
import Radio from "./radio";
import useRadioState from "../../store/radioStore";

const RadioContainer: React.FC = () => {
  const { radios, addRadio } = useRadioState();

  useEffect(() => {
    if (radios.length === 0) {
      addRadio(122.825*1000000, "LFPG_APP");
      addRadio(125.525*1000000, "LFMN_ATIS");
      addRadio(118.775*1000000, "LFKK_I_TWR");
    }
  }, []);

  return (
    <>
      <div className="box-container freq-box">
        <div className="container">
          <div className="row">
            {
              radios.map((radio) => (
                <Radio
                  key={radio.frequency}
                  radio={radio}
                />
              ))
            }
          </div>
        </div>
      </div>
    </>
  );
};

export default RadioContainer;

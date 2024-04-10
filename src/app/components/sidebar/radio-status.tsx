import React from "react";
import useRadioState, { RadioHelper } from "../../store/radioStore";

const RadioStatus: React.FC = () => {
  const [doesRadioExist, selectedRadio, removeRadio] = useRadioState((state) => [
    state.isRadioUnique,
    state.getSelectedRadio(),
    state.removeRadio,
  ]);

  const handleDeleteRadio = () => {
    window.api.removeFrequency(selectedRadio.frequency);
    removeRadio(selectedRadio.frequency);
  };

  return (
    <div className="box-container mt-3 w-100">
      <div style={{ textAlign: "center" }} className="w-100 mb-0">
        Radio Status
      </div>
      <span>Callsign: {selectedRadio ? selectedRadio.callsign : ""}</span>
      <br />
      <span>
        Frequency:{" "}
        {selectedRadio
          ? RadioHelper.convertHzToMhzString(selectedRadio.frequency)
          : ""}
      </span>
      <br />
      <span>Transceivers: {selectedRadio ? selectedRadio.transceiverCount : ''}</span>
      <br />
      <button
        className="btn btn-info w-100 mt-2 btn-sm"
        disabled={!selectedRadio}
      >
        Force Refresh
      </button>
      <button
        className="btn btn-danger w-100 mt-2 btn-sm"
        disabled={!selectedRadio}
        onClick={() => handleDeleteRadio()}
      >
        Delete
      </button>
    </div>
  );
};

export default RadioStatus;

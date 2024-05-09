import React from "react";
import useRadioState, { RadioHelper } from "../../store/radioStore";

const RadioStatus: React.FC = () => {
  const [selectedRadio, removeRadio] = useRadioState((state) => [
    state.getSelectedRadio(),
    state.removeRadio,
  ]);

  const handleDeleteRadio = () => {
    if (!selectedRadio) {
      return;
    }
    void window.api
      .setFrequencyState(
        selectedRadio.frequency,
        false,
        false,
        false,
        false,
        false,
      )
      .then(() => {
        setTimeout(() => {
          void window.api.removeFrequency(selectedRadio.frequency);
          removeRadio(selectedRadio.frequency);
        }, 500);
      });
  };

  const handleForceRefresh = () => {
    if (!selectedRadio) {
      return;
    }
    if (selectedRadio.callsign === "MANUAL") {
      return;
    }
    void window.api.RefreshStation(selectedRadio.callsign);
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
      <span>
        Transceivers: {selectedRadio ? selectedRadio.transceiverCount : ""}
      </span>
      <br />
      <button
        className="btn btn-info w-100 mt-2 btn-sm"
        onClick={() => {
          handleForceRefresh();
        }}
        disabled={!selectedRadio}
      >
        Force Refresh
      </button>
      <button
        className="btn btn-danger w-100 mt-2 btn-sm"
        disabled={!selectedRadio}
        onClick={() => {
          handleDeleteRadio();
        }}
      >
        Delete
      </button>
    </div>
  );
};

export default RadioStatus;

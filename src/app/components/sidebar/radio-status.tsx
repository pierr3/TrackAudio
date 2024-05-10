import React from "react";
import useRadioState, { RadioHelper } from "../../store/radioStore";

const RadioStatus: React.FC = () => {
  const [selectedRadio, removeRadio, setPendingDeletion] = useRadioState((state) => [
    state.getSelectedRadio(),
    state.removeRadio,
    state.setPendingDeletion,
  ]);

  const awaitEndOfRxForDeletion = (frequency: number): void => {
    const interval = setInterval(
      (frequency: number) => {
        const radio = useRadioState.getState().radios.find((r) => r.frequency === frequency);
        if (!radio) {
          clearInterval(interval);
          return;
        }

        if (!radio.currentlyRx && !radio.currentlyTx) {
          void window.api.removeFrequency(radio.frequency);
          removeRadio(radio.frequency);
          clearInterval(interval);
        }
      },
      60,
      frequency
    );

    // Clear the interval after 5 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);
  };

  const handleDeleteRadio = () => {
    if (!selectedRadio) {
      return;
    }
    setPendingDeletion(selectedRadio.frequency, true);
    awaitEndOfRxForDeletion(selectedRadio.frequency);
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
        { selectedRadio?.isPendingDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
};

export default RadioStatus;

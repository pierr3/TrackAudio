import React, { useRef, useState } from "react";
import useRadioState, { RadioHelper } from "../../store/radioStore";
import useSessionStore from "../../store/sessionStore";

const AddFrequency: React.FC = () => {
  const [readyToAdd, setReadyToAdd] = useState(false);
  const [previousValue, setPreviousValue] = useState("");
  const [addRadio, setRx] = useRadioState((state) => [
    state.addRadio,
    state.setRx,
  ]);

  const isNetworkConnected = useSessionStore(
    (state) => state.isNetworkConnected
  );

  const frequencyInputRef = useRef<HTMLInputElement>(null);

  const addFrequency = () => {
    if (!readyToAdd || !isNetworkConnected) {
      return;
    }

    const frequency = frequencyInputRef.current?.value;
    if (!frequency) {
      return;
    }

    const frequencyInHz = RadioHelper.convertMHzToHz(parseFloat(frequency));

    window.api
      .addFrequency(frequencyInHz, "")
      .then((ret) => {
        if (!ret) {
          return; // This will check if the frequency exists and send an error message already
        }
        addRadio(
          frequencyInHz,
          "MANUAL",
          useSessionStore.getState().getStationCallsign()
        );
        setRx(frequencyInHz, true);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    frequencyInputRef.current.value = "";
    setPreviousValue("");
    setReadyToAdd(false);
  };

  const checkFrequency = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frequency = e.target.value;
    if (frequency.length === 3 && previousValue.length < 3) {
      e.target.value = frequency + ".";
      setReadyToAdd(false);
      setPreviousValue(e.target.value);
      return;
    }
    setPreviousValue(e.target.value);

    if (frequency.length < 5) {
      setReadyToAdd(false);
      return;
    }

    const frequencyRegex = new RegExp(
      "^([0-9]{3})([.]{1})([0-9]{1,2})(([0,5]{0,1}))$"
    );

    if (frequencyRegex.test(frequency)) {
      setReadyToAdd(true);
    } else {
      setReadyToAdd(false);
    }
  };

  return (
    <div className="form-group mt-3">
      <label>Add a VHF frequency</label>
      <input
        type="text"
        className="form-control mt-2"
        id="frequencyInput"
        placeholder="---.---"
        onChange={checkFrequency}
        ref={frequencyInputRef}
        onKeyDown={(e) => {
          e.key === "Enter" && addFrequency();
        }}
      ></input>
      <button
        className="btn btn-primary mt-2 w-100"
        onClick={addFrequency}
        disabled={!readyToAdd || !isNetworkConnected}
      >
        Add
      </button>
    </div>
  );
};

export default AddFrequency;

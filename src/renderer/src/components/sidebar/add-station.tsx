import React, { useRef, useState } from 'react';
import useSessionStore from '../../store/sessionStore';

export interface AddStationProps {
  className?: string;
  style?: React.CSSProperties;
  onAddStation?: () => void;
}

const AddStation: React.FC<AddStationProps> = ({ className, style, onAddStation }) => {
  const [readyToAdd, setReadyToAdd] = useState(false);
  const [addLinkedStation, setAddLinkedStation] = useState(true);
  const [isConnected] = useSessionStore((state) => [state.version, state.isConnected]);

  const stationInputRef = useRef<HTMLInputElement>(null);

  const addStation = (addLinkedStation: boolean) => {
    if (!readyToAdd || !isConnected) {
      return;
    }

    const callsign = stationInputRef.current?.value.toUpperCase();
    if (!callsign?.match(/^[A-Z0-9_ -]+$/) || !stationInputRef.current) {
      return;
    }

    void window.api.GetStation(callsign, addLinkedStation);
    stationInputRef.current.value = '';
    setReadyToAdd(false);

    if (onAddStation) {
      onAddStation();
    }
  };

  return (
    <div className={`form-group ${className ?? ''}`} style={style}>
      <h5>Add a Station</h5>
      <input
        type="text"
        className="form-control mt-2"
        id="stationInput"
        placeholder="XXXX_XXX"
        ref={stationInputRef}
        onChange={(e) => {
          setReadyToAdd(e.target.value.length !== 0);
        }}
        onKeyDown={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          e.key === 'Enter' && addStation(addLinkedStation);
        }}
        autoFocus
      ></input>

      <div className="d-flex align-items-center mt-2">
        <label htmlFor="vccsCheckbox" className="form-check-label mb-0">
          Include Linked Stations
        </label>
        <input
          type="checkbox"
          className="form-check-input mt-0 ms-2"
          id="vccsCheckbox"
          defaultChecked={addLinkedStation}
          onChange={(e) => {
            setAddLinkedStation(e.target.checked);
          }}
        />
      </div>

      <button
        className="btn btn-primary mt-2 w-100"
        disabled={!readyToAdd || !isConnected}
        onClick={() => {
          addStation(addLinkedStation);
        }}
      >
        Add
      </button>
    </div>
  );
};

export default AddStation;

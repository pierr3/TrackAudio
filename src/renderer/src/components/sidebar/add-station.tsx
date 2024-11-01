import React, { useRef, useState } from 'react';
import useSessionStore from '../../store/sessionStore';

export interface AddStationProps {
  className?: string;
  style?: React.CSSProperties;
  onAddStation?: () => void;
}

const AddStation: React.FC<AddStationProps> = ({ className, style, onAddStation }) => {
  const [readyToAdd, setReadyToAdd] = useState(false);
  const [isConnected] = useSessionStore((state) => [state.version, state.isConnected]);

  const stationInputRef = useRef<HTMLInputElement>(null);

  const addStation = () => {
    if (!readyToAdd || !isConnected) {
      return;
    }

    const callsign = stationInputRef.current?.value.toUpperCase();
    if (!callsign?.match(/^[A-Z0-9_ -]+$/) || !stationInputRef.current) {
      return;
    }

    void window.api.GetStation(callsign);
    stationInputRef.current.value = '';
    setReadyToAdd(false);

    if (onAddStation) {
      onAddStation();
    }
  };

  return (
    <div className={`form-group ${className ? className : ''}`} style={style}>
      <h5>Add a Station</h5>
      <input
        type="text"
        className="form-control mt-2"
        id="stationInput"
        placeholder="XXXX_XXX"
        ref={stationInputRef}
        onChange={(e) => {
          e.target.value.length !== 0 ? setReadyToAdd(true) : setReadyToAdd(false);
        }}
        onKeyDown={(e) => {
          e.key === 'Enter' && addStation();
        }}
      ></input>

      <button
        className="btn btn-primary mt-2 w-100"
        disabled={!readyToAdd || !isConnected}
        onClick={addStation}
      >
        Add
      </button>
    </div>
  );
};

export default AddStation;

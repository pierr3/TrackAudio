import React, { useRef, useState } from 'react';

import useSessionStore from '@renderer/store/sessionStore';
import AddFrequency from '../sidebar/add-frequency';

export interface AddStationModalProps {
  closeModal: () => void;
}

export enum SaveStatus {
  NoChanges,
  Saving,
  Saved
}

const AddStationModal: React.FC<AddStationModalProps> = ({ closeModal }) => {
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

    closeModal();
  };

  const closeHander = () => {
    closeModal();
  };

  return (
    <>
      <div className="modal settingsModalBackground" role="dialog">
        <div className="modal-dialog settingsModal" role="document">
          <div className="modal-content" style={{ border: '0' }}>
            <div className="modal-header">
              <h5 className="modal-title">AFV Configuration</h5>
            </div>
            <div className="modal-body" style={{ paddingBottom: '0' }}>
              <div className="col-6" style={{ float: 'left' }}>
                <div className="form-group" style={{ width: '90%' }}>
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
              </div>
              <div className="col-5" style={{ float: 'right' }}>
                <AddFrequency
                  onAddFrequency={() => {
                    closeModal();
                  }}
                />
              </div>
            </div>

            <div className="modal-footer mt-3">
              <button type="button" className="btn btn-danger " onClick={closeHander}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddStationModal;

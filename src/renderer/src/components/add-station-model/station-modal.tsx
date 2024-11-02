import React from 'react';

import AddFrequency from '../sidebar/add-frequency';
import AddStation from '../sidebar/add-station';

export interface AddStationModalProps {
  closeModal: () => void;
}

export enum SaveStatus {
  NoChanges,
  Saving,
  Saved
}

const AddStationModal: React.FC<AddStationModalProps> = ({ closeModal }) => {
  const closeHander = () => {
    closeModal();
  };

  return (
    <>
      <div className="modal settingsModalBackground" role="dialog">
        <div className="modal-dialog settingsModal" role="document">
          <div className="modal-content" style={{ border: '0' }}>
            <div className="modal-header">
              <h5 className="modal-title">New Ration</h5>
            </div>
            <div
              className="modal-body"
              style={{ paddingBottom: '0', display: 'flex', justifyContent: 'space-between' }}
            >
              <div className="col" style={{ flex: '1', marginRight: '10px' }}>
                <AddStation
                  onAddStation={() => {
                    closeModal();
                  }}
                />
              </div>
              <div className="col" style={{ flex: '1', marginLeft: '10px' }}>
                <AddFrequency
                  onAddFrequency={() => {
                    closeModal();
                  }}
                />
              </div>
            </div>

            <div className="modal-footer mt-3">
              <button type="button" className="btn btn-danger " onClick={closeHander}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddStationModal;

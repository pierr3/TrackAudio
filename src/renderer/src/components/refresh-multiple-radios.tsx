import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import React from 'react';
import { ArrowClockwise } from 'react-bootstrap-icons';

const RefreshMultipleRadios: React.FC = () => {
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const [radiosSelected] = useRadioState((state) => [state.radiosSelected]);

  const refreshMultipleRadios = () => {
    radiosSelected.forEach((radio) => {
      if (radio.callsign === 'MANUAL') {
        return;
      }
      void window.api.RefreshStation(radio.callsign);
    });
  };

  return (
    <div className="d-flex h-100 align-items-center">
      <button
        className="btn btn-info hide-settings-flex"
        disabled={!isConnected}
        onClick={() => {
          refreshMultipleRadios();
        }}
      >
        <ArrowClockwise />
      </button>
    </div>
  );
};

export default RefreshMultipleRadios;

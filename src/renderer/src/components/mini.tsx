import React, { useState } from 'react';
import useRadioState from '../store/radioStore';
import MiniModeToggleButton from './MiniModeToggleButton';
import useMiniModeManager from '@renderer/helpers/useMiniModeManager';

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isHovered, setIsHovered] = useState(false);

  const { isConnected } = useMiniModeManager();

  if (!isConnected) {
    return (
      <div
        className="box-container-blank transparent-bg mini draggable w-100"
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        <div className="container radio-list">
          <div className="d-flex gap-1 justify-content-between">
            <span style={{ color: 'red' }}>Disconnected</span>
          </div>
        </div>
        {/* Make only the button container no-drag */}
        <div className={`exit-mini-mode-container no-drag ${isHovered ? 'visible' : 'hidden'}`}>
          <MiniModeToggleButton showRestoreButton={true} />
        </div>
      </div>
    );
  }

  if (radios.filter((r) => r.rx).length === 0) {
    return (
      <div
        className="box-container-blank transparent-bg mini draggable w-100"
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        <div className="container radio-list">
          <div className="d-flex gap-1 justify-content-center">
            <span style={{ color: 'red' }}>No RX radios</span>
          </div>
        </div>
        {/* Make only the button container no-drag */}
        <div className={`exit-mini-mode-container no-drag ${isHovered ? 'visible' : 'hidden'}`}>
          <MiniModeToggleButton showRestoreButton={true} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="box-container-blank transparent-bg mini draggable w-100"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <div className="container radio-list">
        {radios
          .filter((r) => r.rx)
          .map((radio) => {
            return (
              <div key={radio.frequency} className="d-flex gap-1 justify-content-between">
                <span style={{ color: radio.currentlyTx ? 'orange' : 'inherit' }}>
                  {radio.callsign !== 'MANUAL' ? radio.callsign : radio.humanFrequency}:
                </span>
                <span
                  style={{ color: radio.currentlyRx ? 'orange' : 'inherit' }}
                  className="rx-text-nofont"
                >
                  {radio.lastReceivedCallsign ? radio.lastReceivedCallsign : '--------'}
                </span>
              </div>
            );
          })}
      </div>
      {/* Make only the button container no-drag */}
      <div className={`exit-mini-mode-container no-drag ${isHovered ? 'visible' : 'hidden'}`}>
        <MiniModeToggleButton showRestoreButton={true} />
      </div>
    </div>
  );
};

export default Mini;

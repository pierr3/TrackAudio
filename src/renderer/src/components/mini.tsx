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
          <div className="d-flex gap-1 justify-content-center">
            <span style={{ color: 'red' }}>Disconnected</span>
          </div>
        </div>
        {/* Make only the button container no-drag */}
        <div className={`exit-mini-mode-container no-drag ${isHovered ? 'visible' : 'hidden'}`}>
          <MiniModeToggleButton showRestoreButton={true} alwaysEnabled />
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
            const radioPrefix = radio.callsign.slice(0, 4);
            const reorderedCallsigns = [
              ...radio.lastReceivedCallsigns.filter((cs) => !cs.startsWith(radioPrefix)),
              ...radio.lastReceivedCallsigns.filter((cs) => cs.startsWith(radioPrefix))
            ];

            return (
              <div
                key={radio.frequency}
                className="d-flex gap-1 justify-content-between"
                style={{ width: '100%' }}
              >
                <span
                  style={{
                    color: radio.isOutputMuted ? 'red' : radio.currentlyTx ? 'orange' : 'inherit',
                    flexShrink: 0
                  }}
                >
                  {radio.callsign !== 'MANUAL' ? radio.callsign : radio.humanFrequency}:
                </span>
                <span
                  style={{
                    color: radio.currentlyRx ? 'orange' : 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingLeft: '10px',
                    textAlign: 'right'
                  }}
                  className="rx-text-nofont"
                  title={reorderedCallsigns.join(', ')}
                >
                  {reorderedCallsigns.length > 0 ? reorderedCallsigns.join(', ') : '--------'}
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

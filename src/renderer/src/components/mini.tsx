import React, { useState } from 'react';
import useRadioState from '../store/radioStore';
import MiniModeToggleButton from './MiniModeToggleButton';

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="box-container mini"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <div className="container">
        {radios
          .filter((r) => r.rx)
          .map((radio) => {
            return (
              <div key={radio.frequency}>
                <span style={{ color: radio.currentlyTx ? 'orange' : 'inherit' }}>
                  {radio.callsign !== 'MANUAL' ? radio.callsign : radio.humanFrequency}
                </span>
                :{' '}
                <span style={{ color: radio.currentlyRx ? 'green' : 'inherit' }}>
                  {radio.lastReceivedCallsign ? radio.lastReceivedCallsign : ''}
                </span>
              </div>
            );
          })}
      </div>
      <div className={`exit-mini-mode-container ${isHovered ? 'visible' : 'hidden'}`}>
        <MiniModeToggleButton showRestoreButton={true} />
      </div>
    </div>
  );
};

export default Mini;

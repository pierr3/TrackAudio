import React, { useEffect, useState } from 'react';
import useRadioState from '../store/radioStore';
import MiniModeToggleButton from './MiniModeToggleButton';
import { useMediaQuery } from 'react-responsive';

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isHovered, setIsHovered] = useState(false);
  const isMiniMode = useMediaQuery({ maxWidth: '330px' });
  useEffect(() => {
    const numOfRadios = radios.filter((r) => r.rx).length;
    const miniModeHeightMin = 22 + 24 * (numOfRadios === 0 ? 1 : numOfRadios);

    if (isMiniMode) {
      document.body.style.backgroundColor = 'transparent';
      window.api.window.setMinimumSize(250, miniModeHeightMin);
      window.api.window.setWindowButtonVisibility(false);
    } else {
      document.body.style.backgroundColor = '#2c2f45';
      window.api.window.setMinimumSize(250, 120);
      window.api.window.setWindowButtonVisibility(true);
    }
  }, [isMiniMode]);

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
                  {radio.lastReceivedCallsign ? radio.lastReceivedCallsign : ''}
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

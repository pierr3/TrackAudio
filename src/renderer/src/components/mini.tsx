import React, { useEffect, useState } from 'react';
import useRadioState from '../store/radioStore';
import MiniModeToggleButton from './MiniModeToggleButton';
import { useMediaQuery } from 'react-responsive';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const [isHovered, setIsHovered] = useState(false);
  const [platform] = useUtilStore((state) => [state.platform]);
  const isMiniMode = useMediaQuery({ maxWidth: '455px' });
  const isGoingMiniMode = useMediaQuery({ maxHeight: '240px', maxWidth: '560px' });
  const [wasConnected, setWasConnected] = useState(false);
  const [wasInMiniMode, setWasInMiniMode] = useState(false);
  const [transparencyMiniMode] = useUtilStore((state) => [state.transparentMiniMode]);

  useEffect(() => {
    if (isConnected && !wasConnected) {
      window.api.window.setMinimumSize(250, 120);
    } else if (!isConnected && wasConnected) {
      window.api.window.setMinimumSize(530, 240);
    }

    if (!transparencyMiniMode) {
      document.body.style.backgroundColor = '#2c2f45';
    }

    setWasConnected(isConnected);

    const numOfRadios = radios.filter((r) => r.rx).length;
    const miniModeHeightMin = 22 + 24 * (numOfRadios === 0 ? 1 : numOfRadios);

    if (isGoingMiniMode && isConnected && !isMiniMode) {
      window.api.window.setMinimumSize(250, 120);
    } else if (isMiniMode) {
      if (transparencyMiniMode) {
        document.body.style.backgroundColor = 'transparent';
      }
      window.api.window.setMinimumSize(250, miniModeHeightMin);
      if (platform === 'darwin') {
        window.api.window.setWindowButtonVisibility(false);
      }
      setWasInMiniMode(true);
    } else if (wasInMiniMode) {
      console.log('Restoring');
      document.body.style.backgroundColor = '#2c2f45';
      window.api.window.setMinimumSize(530, 240);
      if (platform === 'darwin') {
        window.api.window.setWindowButtonVisibility(true);
      }
      setWasInMiniMode(false);
    }
  }, [
    isConnected,
    wasConnected,
    isGoingMiniMode,
    isMiniMode,
    radios,
    platform,
    transparencyMiniMode
  ]);

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

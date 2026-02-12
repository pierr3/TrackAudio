import React from 'react';
import useRadioState from '../store/radioStore';
import MiniModeToggleButton from './MiniModeToggleButton';
import useMiniModeManager from '@renderer/helpers/useMiniModeManager';

const Mini: React.FC = () => {
  const [radios] = useRadioState((state) => [state.radios]);

  const { isConnected } = useMiniModeManager();

  if (!isConnected || radios.filter((r) => r.rx).length === 0) {
    return (
      <div className="box-container-blank transparent-bg mini draggable w-100">
        <div className="container radio-list">
          <div className="d-flex gap-1 justify-content-center">
            <span style={{ color: 'red' }}>
              {!isConnected
                ? 'Not connected'
                : radios.filter((r) => r.rx).length === 0
                  ? 'No RX radios'
                  : ''}
            </span>
          </div>
        </div>
        {/* Make only the button container no-drag */}
        <div className={`exit-mini-mode-container no-drag`}>
          <MiniModeToggleButton showRestoreButton={true} alwaysEnabled />
        </div>
      </div>
    );
  }

  return (
    <div className="box-container-blank transparent-bg mini draggable w-100">
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
              <div key={radio.frequency} className="d-flex gap-1 justify-content-between">
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
      <div className={`exit-mini-mode-container no-drag`}>
        <MiniModeToggleButton showRestoreButton={true} />
      </div>
    </div>
  );
};

export default Mini;

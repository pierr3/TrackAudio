import useRadioState from '@renderer/store/radioStore';
import clsx from 'clsx';
import React, { useMemo } from 'react';

const ExpandedRxInfo: React.FC = () => {
  const radios = useRadioState((state) => state.radios);
  const radiosWithRx = useMemo(() => radios.filter((radio) => radio.rx), [radios]);

  return (
    <div className="d-flex align-items-center flex-column">
      <div>RX LIST</div>
      {radiosWithRx.map((radio) => (
        <div className="h-100 rx-bar-container d-flex w-100" key={radio.frequency}>
          <div className="d-flex justify-content-start align-items-center align-self-start text-truncate">
            <span className={clsx('unicom-text', radio.isOutputMuted && 'text-danger')}>
              {radio.callsign}:
            </span>
          </div>
          <div className="flex-grow-1 d-flex justify-content-end align-items-center text-truncate">
            {radio.lastReceivedCallsigns.length > 0 ? (
              <span className="rx-text">
                {radio.lastReceivedCallsigns.map((callsign, index) => (
                  <div
                    key={index}
                    className={`${radio.currentlyRx ? 'text-warning' : 'text-grey'} text-end`}
                  >
                    {' '}
                    {callsign}
                  </div>
                ))}
              </span>
            ) : (
              <span className="unicom-text">
                <div className="text-grey">--------</div>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExpandedRxInfo;

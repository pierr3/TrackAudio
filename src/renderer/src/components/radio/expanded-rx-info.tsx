import useRadioState from '@renderer/store/radioStore';
import React, { useMemo } from 'react';

const ExpandedRxInfo: React.FC = () => {
  const radios = useRadioState((state) => state.radios);

  const radiosWithRx = useMemo(() => {
    return radios.filter((radio) => radio.rx);
  }, [radios]);

  return (
    <div className="d-flex h-100 align-items-center flex-column">
      <div>RX LIST</div>
      {radiosWithRx.map((radio) => (
        <div className="rx-bar-container d-flex w-100" key={radio.frequency}>
          <div
            className="d-flex justify-content-start"
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
          >
            <span className="unicom-text">{radio.callsign}:</span>
          </div>
          <div
            className="flex-grow-1 d-flex justify-content-center align-items-center"
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
          >
            {radio.lastReceivedCallsign ? (
              <span className="rx-text">
                <div className={radio.currentlyRx ? 'text-warning' : 'text-grey'}>
                  {radio.lastReceivedCallsign}
                </div>
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

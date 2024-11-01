import useRadioState from '@renderer/store/radioStore';
import React, { useMemo, useState, useEffect } from 'react';
import type { RadioType } from '@renderer/store/radioStore';
import { ArrowsAngleExpand } from 'react-bootstrap-icons';
import useUtilStore from '@renderer/store/utilStore';
import clsx from 'clsx';

const RxInfo: React.FC = () => {
  const radios = useRadioState((state) => state.radios);
  const [lastActiveRadio, setLastActiveRadio] = useState<RadioType | null>(null);
  const [showExpandedRxInfo, setShowExpandedRxInfo] = useUtilStore((state) => [
    state.showExpandedRxInfo,
    state.setShowExpandedRxInfo
  ]);
  useEffect(() => {
    const currentlyReceiving = radios.find(
      (radio) => radio.rx && radio.lastReceivedCallsign && radio.currentlyRx
    );

    if (currentlyReceiving) {
      setLastActiveRadio(currentlyReceiving);
    }
  }, [radios]);

  const displayRadio = useMemo(() => {
    const currentlyReceiving = radios.find(
      (radio) => radio.rx && radio.lastReceivedCallsign && radio.currentlyRx
    );
    return currentlyReceiving ?? lastActiveRadio;
  }, [radios, lastActiveRadio]);

  const isCurrentlyReceiving = useMemo(() => {
    return radios.some((radio) => radio.rx && radio.lastReceivedCallsign && radio.currentlyRx);
  }, [radios]);

  return (
    <div className="d-flex h-100 align-items-center " style={{ gap: '15px' }}>
      <div className="unicom-bar-container d-flex" style={{ width: '130px' }}>
        <div className="d-flex justify-content-start">
          <span className="unicom-text">RX:</span>
        </div>
        <div
          className="flex-grow-1 d-flex justify-content-center align-items-center"
          style={{
            lineHeight: '29px'
          }}
        >
          {displayRadio ? (
            <span className="rx-text">
              <div
                className={clsx(
                  'font-weight-bold',
                  isCurrentlyReceiving ? 'text-warning' : 'text-grey'
                )}
              >
                {displayRadio.lastReceivedCallsign}
              </div>
            </span>
          ) : (
            <span className="rx-text">
              <div className="text-grey">--------</div>
            </span>
          )}
        </div>
      </div>
      <div className="d-flex h-100 align-items-center">
        <button
          className="btn btn-primary hide-settings-flex rx-info-expand"
          // disabled={isConnected || isConnecting}
          onClick={() => {
            setShowExpandedRxInfo(!showExpandedRxInfo);
          }}
        >
          <ArrowsAngleExpand />
        </button>
      </div>
    </div>
  );

  // return (
  //   <div className="d-flex align-items-center h-100 rx-container">
  //     <h5 className="mr-md-auto rx-text m-1 pt-0.5 d-flex gap-2">
  //       {displayRadio && (
  // <div className={isCurrentlyReceiving ? 'text-warning' : 'text-grey'}>
  //   {displayRadio.lastReceivedCallsign}
  // </div>
  //       )}
  //     </h5>
  //   </div>
  // );
};

export default RxInfo;

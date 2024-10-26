import useRadioState from '@renderer/store/radioStore';
import React, { useMemo } from 'react';

const RxInfo: React.FC = () => {
  const radios = useRadioState((state) => state.radios);
  const rxRadios = useMemo(() => {
    return radios.filter((radio) => radio.rx && radio.lastReceivedCallsign);
  }, [radios]);

  return (
    <div className="d-flex align-items-center h-100 rx-container">
      <h5 className="mr-md-auto rx-text m-1 pt-0.5 d-flex gap-2">
        {rxRadios.map((radio, index) => (
          <div className={radio.currentlyRx ? 'text-warning' : 'text-grey'} key={index}>
            {radio.lastReceivedCallsign}
          </div>
        ))}
      </h5>
    </div>
  );
};

export default RxInfo;

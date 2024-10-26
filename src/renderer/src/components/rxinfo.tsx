import useRadioState from '@renderer/store/radioStore';
import React, { useMemo, useState, useEffect } from 'react';
import type { RadioType } from '@renderer/store/radioStore';

const RxInfo: React.FC = () => {
  const radios = useRadioState((state) => state.radios);
  const [lastActiveRadio, setLastActiveRadio] = useState<RadioType | null>(null);

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
    <div className="d-flex align-items-center h-100 rx-container">
      <h5 className="mr-md-auto rx-text m-1 pt-0.5 d-flex gap-2">
        {displayRadio && (
          <div className={isCurrentlyReceiving ? 'text-warning' : 'text-grey'}>
            {displayRadio.lastReceivedCallsign}
          </div>
        )}
      </h5>
    </div>
  );
};

export default RxInfo;

import { RadioType } from '@renderer/store/radioStore';
import React, { useMemo } from 'react';

type LastReceivedCallsignsProps = {
  radios: RadioType[];
};

const LastReceivedCallsigns: React.FC<LastReceivedCallsignsProps> = ({ radios }) => {
  const rxRadios = useMemo(() => {
    return radios.filter((radio) => radio.rx && radio.lastReceivedCallsign);
  }, [radios]);

  return (
    <div className="box-container mt-3 w-100">
      <div className="w-100 mb-0 text-center">Last RX</div>
      {rxRadios.map((radio, index) => (
        <div key={index}>
          {radio.callsign}: {radio.lastReceivedCallsign}
        </div>
      ))}
    </div>
  );
};

export default LastReceivedCallsigns;

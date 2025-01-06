import { RadioType } from '@renderer/store/radioStore';
import React, { useMemo } from 'react';

interface LastReceivedCallsignsProps {
  radios: RadioType[];
}

const LastReceivedCallsigns: React.FC<LastReceivedCallsignsProps> = ({ radios }) => {
  const rxRadios = useMemo(() => {
    return radios.filter((radio) => radio.rx);
  }, [radios]);

  return (
    <div className="box-container mt-3 w-100">
      <div className="w-100 mb-0 text-center">Last RX</div>
      {rxRadios.map((radio, index) => (
        <div key={index}>
          {radio.callsign}:
          <div className="ml-4">
            {radio.lastReceivedCallsigns.map((callsign, idx) => (
              <div key={idx}>{callsign}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LastReceivedCallsigns;

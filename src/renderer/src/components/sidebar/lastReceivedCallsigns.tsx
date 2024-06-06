import { RadioType } from '@renderer/store/radioStore';
import React from 'react';

type LastReceivedCallsignsProps = {
  radios: RadioType[];
};

const LastReceivedCallsigns: React.FC<LastReceivedCallsignsProps> = ({ radios }) => {
  return (
    <div className="box-container mt-3 w-100">
      {' '}
      <div style={{ textAlign: 'center' }} className="w-100 mb-0">
        Last RX
      </div>
      {radios
        .filter((radio) => radio.rx && radio.lastReceivedCallsign)
        .map((radio, index) => (
          <div key={index}>
            {radio.callsign}: {radio.lastReceivedCallsign}
          </div>
        ))}
    </div>
  );
};

export default LastReceivedCallsigns;

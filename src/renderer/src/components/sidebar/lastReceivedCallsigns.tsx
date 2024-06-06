import { RadioType } from '@renderer/store/radioStore';
import React from 'react';

type LastReceivedCallsignsProps = {
  lastReceivedCallsigns: RadioType[];
};

const LastReceivedCallsigns: React.FC<LastReceivedCallsignsProps> = ({ lastReceivedCallsigns }) => {
  return (
    <div className="box-container mt-3 w-100">
      {' '}
      <div style={{ textAlign: 'center' }} className="w-100 mb-0">
        Last RX
      </div>
      {lastReceivedCallsigns.map((radio, index) => (
        <div key={index}>
          {radio.callsign}: {radio.lastReceivedCallsign}
        </div>
      ))}
    </div>
  );
};

export default LastReceivedCallsigns;

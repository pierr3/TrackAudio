import React, { useEffect, useState } from 'react';

const Clock: React.FC = () => {
  const [time, setTime] = useState<string | undefined>('XX:XX:XXZ');

  useEffect(() => {
    setInterval(() => {
      const dateObject = new Date();

      const hour = dateObject.getUTCHours().toString();
      const minute = dateObject.getUTCMinutes().toString();
      const second = dateObject.getUTCSeconds().toString();

      const currentTime =
        hour.padStart(2, '0') + ':' + minute.padStart(2, '0') + ':' + second.padStart(2, '0') + 'Z';

      setTime(currentTime);
    }, 1000);
  }, []);
  return (
    <div className="d-flex align-items-center h-100">
      <h5 className="mr-md-auto clock-text m-1 pt-0.5">{time}</h5>
    </div>
  );
};

export default Clock;

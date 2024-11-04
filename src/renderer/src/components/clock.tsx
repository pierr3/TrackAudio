import useUtilStore from '@renderer/store/utilStore';
import React, { useEffect, useState } from 'react';

const Clock: React.FC = () => {
  const [time, setLocalTime] = useState<string>('XX:XX:XXZ');
  const [setTime] = useUtilStore((state) => [state.setTime]);
  useEffect(() => {
    const formatTime = (dateObject: Date): string => {
      const hour = dateObject.getUTCHours().toString().padStart(2, '0');
      const minute = dateObject.getUTCMinutes().toString().padStart(2, '0');
      const second = dateObject.getUTCSeconds().toString().padStart(2, '0');
      return `${hour}:${minute}:${second}Z`;
    };

    setLocalTime(formatTime(new Date()));

    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();

    const initialTimeoutId = setTimeout(() => {
      setLocalTime(formatTime(new Date()));
      setTime(new Date());

      const intervalId = setInterval(() => {
        setLocalTime(formatTime(new Date()));
        setTime(new Date());
      }, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }, msUntilNextSecond);

    return () => {
      clearTimeout(initialTimeoutId);
    };
  }, []);

  return (
    <div className="d-flex align-items-center h-100">
      <h5 className="mr-md-auto clock-text m-1 pt-0.5">{time}</h5>
    </div>
  );
};

export default Clock;

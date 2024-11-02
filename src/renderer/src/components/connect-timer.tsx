import { useState, useEffect } from 'react';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';

const ConnectTimer = () => {
  const connectTimestamp = useSessionStore((state) => state.connectTimestamp);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);
  const [time] = useUtilStore((state) => [state.time]);

  useEffect(() => {
    if (!connectTimestamp) return;
    const difference = Number(time) - Number(connectTimestamp);

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    if (hours < 0 || minutes < 0 || seconds < 0) {
      setElapsedTime(null);
      return;
    }

    const formattedTime =
      `${hours.toString().padStart(2, '0')}:` +
      `${minutes.toString().padStart(2, '0')}:` +
      seconds.toString().padStart(2, '0');

    setElapsedTime(formattedTime);
  }, [time]);

  if (!elapsedTime) {
    return;
  }

  return <span className="text-muted elapsed-time">{elapsedTime}</span>;
};

export default ConnectTimer;

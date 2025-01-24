import { UpdateInfo } from 'electron-updater';
import { useEffect, useState } from 'react';

interface FinishedUpdateProps {
  updateInfo: UpdateInfo;
}

const FinishedUpdate = ({ updateInfo }: FinishedUpdateProps) => {
  const countdownDuration = 5;
  const [countdown, setCountdown] = useState(countdownDuration);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          window.api.updater.quitAndInstall();
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="update-card">
      <div className="version-header d-flex text-center align-items-center justify-content-center">
        Downloaded TrackAudio
        <div>
          <span className="badge bg-primary ms-2">v{updateInfo.version}</span>
        </div>
      </div>
      <div className="status-text d-flex text-center justify-content-center">
        Restarting in {countdown}...
      </div>
      <div className="progress">
        <div
          className="progress-bar progress-bar-striped progress-bar-animated"
          role="progressbar"
          style={{ width: `${((countdown / countdownDuration) * 100).toString()}%` }}
          aria-valuenow={countdown}
          aria-valuemin={0}
          aria-valuemax={countdownDuration}
        />
      </div>
    </div>
  );
};

export default FinishedUpdate;

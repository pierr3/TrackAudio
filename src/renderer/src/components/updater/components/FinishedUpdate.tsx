import { UpdateInfo } from 'electron-updater';
import { useEffect, useState } from 'react';

interface FinishedUpdateProps {
  updateInfo: UpdateInfo;
}

const FinishedUpdate = ({ updateInfo }: FinishedUpdateProps) => {
  const countdownDuration = 10; // replace with your value
  const [countdown, setCountdown] = useState(countdownDuration);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(intervalId);
          window.api.updater.quitAndInstall();
          return prevCountdown;
        } else {
          return prevCountdown - 1;
        }
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    }; // cleanup on component unmount
  }, []);

  const percentWidth = (countdown / countdownDuration) * 100;

  return (
    <div className="list-group-item list-group-item-updating list-group-item-action global-text">
      <div className="d-flex w-100 flex-column justify-content-between align-items-center">
        <div className="name-text d-flex flex-column align-items-center gap-2 w-100">
          <div className="d-flex flex-column align-items-center">
            <div>Succesfully downloaded (v{updateInfo.version})</div>

            <small className="createdat-text">Restarting in {countdown}...</small>
          </div>
          <div className="progress w-100">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated bg-info progress-bar-div"
              role="progressbar"
              style={{ width: `${percentWidth.toString()}%` }}
              aria-valuenow={countdown}
              aria-valuemin={0}
              aria-valuemax={countdownDuration}
            >
              {countdown}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinishedUpdate;

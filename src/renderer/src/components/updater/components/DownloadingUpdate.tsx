import { ProgressInfo, UpdateInfo } from 'electron-updater';
import { useEffect, useState } from 'react';

interface DownloadingUpdateProps {
  updateInfo: UpdateInfo;
  onUpdateDownloaded: () => void;
  onError: (title: string, message: string) => void;
}

const DownloadingUpdate = ({ updateInfo, onUpdateDownloaded, onError }: DownloadingUpdateProps) => {
  const [downloadProgress, setDownloadProgress] = useState<ProgressInfo>();

  useEffect(() => {
    window.api.updater
      .onUpdateDownloaded()
      .then(() => {
        onUpdateDownloaded();
      })
      .catch(() => {
        onError('Unknown Error!', 'An unknown error occurred while checking for updates.');
      });

    const unsubscribeOnDownloadProgress = window.api.updater.onUpdateDownloadProgress(
      (progress) => {
        setDownloadProgress(progress);
      }
    );
    return () => {
      unsubscribeOnDownloadProgress();
    };
  }, []);

  const bytesToMB = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  if (!downloadProgress) {
    return (
      <div className="list-group-item list-group-item-updating list-group-item-action global-text">
        <div className="d-flex w-100 flex-column justify-content-between align-items-center">
          <div className="name-text d-flex flex-column align-items-center gap-2  w-100">
            <div>Downloading latest update... v{updateInfo.version}</div>
            <small className="createdat-text">Awaiting download to start...</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="list-group-item list-group-item-updating list-group-item-action global-text">
      <div className="d-flex w-100 flex-column justify-content-between align-items-center">
        <div className="name-text d-flex flex-column align-items-center gap-2  w-100">
          <div className="d-flex flex-column align-items-center">
            <div>Downloading latest update... v{updateInfo.version}</div>

            <small className="createdat-text">
              Downloaded: {bytesToMB(Math.round(downloadProgress.transferred))}/
              {bytesToMB(Math.round(downloadProgress.total))} @{' '}
              {bytesToMB(Math.round(downloadProgress.bytesPerSecond))}MB/s
            </small>
          </div>
          <div className="progress w-100">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated bg-info progress-bar-div"
              role="progressbar"
              style={{ width: `${downloadProgress.percent.toString()}%` }}
              aria-valuenow={downloadProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {downloadProgress.percent}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadingUpdate;

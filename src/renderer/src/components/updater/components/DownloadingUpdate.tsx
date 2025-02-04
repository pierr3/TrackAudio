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
      .then(onUpdateDownloaded)
      .catch(() => {
        onError('Unknown Error!', 'An unknown error occurred while checking for updates.');
      });

    const unsubscribe = window.api.updater.onUpdateDownloadProgress(setDownloadProgress);
    return unsubscribe;
  }, []);

  const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

  if (!downloadProgress) {
    return (
      <div className="update-card">
        <div className="version-header d-flex text-center align-items-center justify-content-center ">
          Downloading TrackAudio
          <div>
            <span className="badge bg-primary ms-2">v{updateInfo.version}</span>
          </div>
        </div>
        <div className="status-text d-flex text-center justify-content-center">
          Awaiting download to start...
        </div>
      </div>
    );
  }

  return (
    <div className="update-card">
      <div className="version-header d-flex text-center align-items-center justify-content-center ">
        Downloading TrackAudio
        <div>
          <span className="badge bg-primary ms-2">v{updateInfo.version}</span>
        </div>
      </div>
      <div className="progress">
        <div
          className="progress-bar progress-bar-striped progress-bar-animated"
          role="progressbar"
          style={{ width: `${downloadProgress.percent.toString()}%` }}
          aria-valuenow={downloadProgress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="stats text-muted">
        <span>
          {formatBytes(downloadProgress.transferred)}/{formatBytes(downloadProgress.total)} MB
        </span>
        <span>{formatBytes(downloadProgress.bytesPerSecond)} MB/s</span>
      </div>
    </div>
  );
};

export default DownloadingUpdate;

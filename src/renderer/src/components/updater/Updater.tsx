import { useEffect, useState } from 'react';

import './Updater.scss';
import DownloadingUpdate from './components/DownloadingUpdate';
import { UpdateInfo } from 'electron-updater';
import UpdateError from './components/UpdateError';
import FinishedUpdate from './components/FinishedUpdate';
import CheckingForUpdates from './components/CheckingForUpdate';
interface UpdaterProps {
  onUpdateFound?: (update: UpdateInfo) => void;
}

function Updater({ onUpdateFound }: UpdaterProps) {
  const [checkingForUpdates, setCheckingForUpdates] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    const unsubscribeOnUpdateError = window.api.updater.onUpdateError(() => {
      setUpdateAvailable(null);
      setCheckingForUpdates(false);
    });

    return () => {
      unsubscribeOnUpdateError();
      setCheckingForUpdates(false);
    };
  }, []);

  const updateFound = (update: UpdateInfo) => {
    onUpdateFound?.(update);
    setCheckingForUpdates(false);
    setUpdateAvailable(update);
  };

  const onError = (title: string, message: string) => {
    setError({ title, message });
    setCheckingForUpdates(false);
    setUpdateAvailable(null);
  };

  const onUpdateDownloaded = () => {
    setCheckingForUpdates(false);
    setError(null);

    setUpdateDownloaded(true);
  };

  if (checkingForUpdates) {
    return (
      <CheckingForUpdates
        onUpdatesFound={updateFound}
        onNoUpdatesFound={() => {
          setCheckingForUpdates(false);
        }}
        onError={onError}
      />
    );
  }

  if (!updateAvailable) {
    return null;
  }

  return (
    <div>
      <div
        className="position-absolute sub-structure d-flex justify-content-center align-items-center w-100 "
        style={{ zIndex: 60 }}
      >
        <div className="h-100 w-75 mx-3 d-flex justify-content-center flex-column hide-topbar align-items-center">
          {error ? (
            <UpdateError title={error.title} message={error.message} />
          ) : (
            <>
              <div className="mx-3">
                <div className="list-group mt-3 mb-3">
                  {updateDownloaded ? (
                    <FinishedUpdate updateInfo={updateAvailable} />
                  ) : (
                    <DownloadingUpdate
                      updateInfo={updateAvailable}
                      onUpdateDownloaded={onUpdateDownloaded}
                      onError={onError}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Updater;

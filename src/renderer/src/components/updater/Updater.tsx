import { useEffect, useState } from 'react';

import './Updater.scss';
import DownloadingUpdate from './components/DownloadingUpdate';
import { UpdateInfo } from 'electron-updater';
import CheckingForUpdates from './components/CheckingForUpdate';
import UpdateError from './components/UpdateError';
import FinishedUpdate from './components/FinishedUpdate';
import TitleBar from '../titlebar/TitleBar';
interface UpdaterProps {
  onFinish: () => void;
}

function Updater({ onFinish }: UpdaterProps) {
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
    setCheckingForUpdates(false);
    setUpdateAvailable(update);
  };

  const noUpdateFound = () => {
    setCheckingForUpdates(false);
    onFinish();
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
  return (
    <div>
      <TitleBar className="d-flex flex-md-row align-items-center custom-navbar hide-topbar">
        <TitleBar.Section priority={3} name="left">
          <TitleBar.Element priority={1}>
            <div></div>
          </TitleBar.Element>
        </TitleBar.Section>
        <TitleBar.Section priority={1} name="center">
          <TitleBar.Element priority={1}>
            <div className="d-flex h-100 align-items-center draggable" style={{ lineHeight: 0 }}>
              Track Audio
            </div>
          </TitleBar.Element>
        </TitleBar.Section>
        <TitleBar.Section priority={2} name="right">
          <TitleBar.Element priority={1}>
            <div></div>
          </TitleBar.Element>
        </TitleBar.Section>
      </TitleBar>
      <div className="structure-top d-flex justify-content-center align-items-center">
        <div className="h-100 w-75 mx-3 d-flex justify-content-center flex-column hide-topbar align-items-center">
          {error ? (
            <UpdateError title={error.title} message={error.message} />
          ) : (
            <>
              {checkingForUpdates && (
                <CheckingForUpdates
                  onNoUpdatesFound={noUpdateFound}
                  onUpdatesFound={updateFound}
                  onError={onError}
                />
              )}
              {!checkingForUpdates && updateAvailable && (
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
              )}
            </>
          )}
        </div>
        {/* <div className="d-flex w-100 justify-content-center">
          <Loader /> */}
        {/* <div
            className="d-flex justify-content-center"
          >

          </div>
        </div>
        {/* <div className="d-flex justify-content-center position-absolute start-50 translate-middle-x align-items-center gap-1">
          <div className="checking-for-update-text">{message}</div>
        </div> */}
      </div>
    </div>
  );
}

export default Updater;

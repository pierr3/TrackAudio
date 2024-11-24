import useSessionStore from '@renderer/store/sessionStore';
import RadioStatus from './sidebar/radio-status';
import useUtilStore from '@renderer/store/utilStore';
import ConnectTimer from './connect-timer';
import { useMediaQuery } from 'react-responsive';
import clsx from 'clsx';

const FocusBar = () => {
  const [version, isConnected, connectTimestamp] = useSessionStore((state) => [
    state.version,
    state.isConnected,
    state.connectTimestamp
  ]);
  const [pendingRestart] = useUtilStore((state) => [state.pendingRestart]);
  const isWideScreen = useMediaQuery({ minWidth: '800px' });
  const isSmallScreen = useMediaQuery({ maxWidth: '490px' });

  const restartApp = () => {
    if (isConnected) {
      return;
    }
    window.api.Restart().catch((error: unknown) => {
      console.error(error);
    });
  };

  return (
    <div className="focusbar-container bg-dark hide-topbar">
      <div className="container-fluid h-100">
        <div className="h-100 position-relative">
          <div
            className="position-absolute h-100 d-flex align-items-center"
            style={{ left: 0, width: '300px' }}
          >
            {pendingRestart && !isConnected ? (
              <a className="small font-weight-bold text-danger cursor" onClick={restartApp}>
                Click here to reload to apply changes
              </a>
            ) : (
              connectTimestamp && isWideScreen && <ConnectTimer />
            )}
          </div>

          <div
            className={clsx(
              'position-absolute d-flex align-items-center h-100 w-100',
              isWideScreen
                ? 'justify-content-center'
                : isSmallScreen
                  ? 'justify-content-center'
                  : 'justify-content-start'
            )}
            style={{
              lineHeight: 1,
              pointerEvents: 'none'
            }}
          >
            <div className="text-nowrap" style={{ pointerEvents: 'auto' }}>
              <RadioStatus />
            </div>
          </div>

          {!isSmallScreen && (
            <div
              className="position-absolute h-100 d-flex align-items-center"
              style={{ right: 0, width: '200px' }}
            >
              <div className="licenses text-nowrap text-muted ms-auto">
                <span className="d-none d-sm-inline">{version} |&nbsp;</span>
                <a
                  href="https://github.com/pierr3/TrackAudio/blob/main/LICENSES_COMPILED.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Licenses
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FocusBar;

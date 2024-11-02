import useSessionStore from '@renderer/store/sessionStore';
import RadioStatus from './sidebar/radio-status';
import useUtilStore from '@renderer/store/utilStore';
import ConnectTimer from './connect-timer';

const FocusBar = () => {
  const [version, isConnected, connectTimestamp] = useSessionStore((state) => [
    state.version,
    state.isConnected,
    state.connectTimestamp
  ]);
  const [pendingRestart] = useUtilStore((state) => [state.pendingRestart]);

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
          {pendingRestart && !isConnected ? (
            <div
              className="col-12 d-flex justify-content-start align-items-center position-absolute w-100 h-100"
              style={{ zIndex: 3 }}
            >
              <a className="small font-weight-bold text-danger cursor" onClick={restartApp}>
                Fast reload required to apply changes
              </a>
            </div>
          ) : (
            connectTimestamp && (
              <div
                className="col-12 d-flex justify-content-start align-items-center position-absolute w-100 h-100"
                style={{ zIndex: 3 }}
              >
                <ConnectTimer />
              </div>
            )
          )}

          {/* Center Radio Status */}
          <div className="col-12 d-flex justify-content-center align-items-center position-absolute w-100 h-100">
            <div className="text-nowrap">
              <RadioStatus />
            </div>
          </div>

          {/* Right-aligned licenses with z-index to ensure clickability */}
          <div
            className="col-12 d-flex justify-content-end align-items-center h-100 position-relative"
            style={{ zIndex: 1 }}
          >
            <div className="licenses text-nowrap">
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
        </div>
      </div>
    </div>
  );
};

export default FocusBar;

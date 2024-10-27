import React from 'react';
import useSessionStore from '@renderer/store/sessionStore';
import useErrorStore from '@renderer/store/errorStore';
import { checkIfCallsignIsRelief, getCleanCallsign } from '../../../helpers/CallsignHelper';
import clsx from 'clsx';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const postError = useErrorStore((state) => state.postError);
  const [
    isConnected,
    isConnecting,
    setIsConnecting,
    setIsConnected,
    callsign,
    isNetworkConnected,
    isAtc,
    setStationCallsign
  ] = useSessionStore((state) => [
    state.isConnected,
    state.isConnecting,
    state.setIsConnecting,
    state.setIsConnected,
    state.callsign,
    state.isNetworkConnected,
    state.isAtc,
    state.setStationCallsign
  ]);

  const doConnect = () => {
    setIsConnecting(true);
    window.api
      .connect()
      .then((ret) => {
        if (!ret) {
          postError('Error connecting to AFV, check your configuration and credentials.');
          setIsConnecting(false);
          setIsConnected(false);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const handleConnectDisconnect = () => {
    if (isConnected) {
      void window.api.disconnect();
      return;
    }

    if (!isNetworkConnected) {
      return;
    }

    if (checkIfCallsignIsRelief(callsign) && isAtc) {
      const reliefCallsign = getCleanCallsign(callsign);
      window.api
        .dialog(
          'question',
          'Relief callsign detected',
          'You might be using a relief callsign, please select which callsign you want to use.',
          [callsign, reliefCallsign]
        )
        .then((ret) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (ret.response === 0) {
            setStationCallsign(callsign);
          } else {
            setStationCallsign(reliefCallsign);
          }
        })
        .then(() => {
          doConnect();
        })
        .catch((err: unknown) => {
          console.error(err);
        });
    } else {
      setStationCallsign(callsign);
      doConnect();
    }
  };

  return (
    <button
      className={clsx(
        `toolbar-btn connection-status btn static-item px-2 d-flex flex-row main-status ${className}`,
        isConnected && 'btn-danger',
        isConnecting && 'btn-warning',
        !isConnected && !isConnecting && isNetworkConnected && 'btn-success'
      )}
      onClick={handleConnectDisconnect}
      disabled={!isNetworkConnected}
    >
      {isConnected && callsign
        ? 'DISCONNECT'
        : isConnecting
          ? 'CONNECTING'
          : callsign
            ? `CONNECT`
            : 'NO ACTIVE CONNECTION'}
    </button>
  );

  return isConnected && callsign ? (
    <div
      className={`toolbar-btn connection-status btn static-item px-2 d-flex flex-row connected main-status ${className}`}
      onClick={handleConnectDisconnect}
    >
      {callsign}
    </div>
  ) : (
    <button
      className={`toolbar-btn  connect-status btn btn-success px-2 d-flex flex-row disconnected  ${className}`}
      onClick={handleConnectDisconnect}
    >
      CONNECT TO AFV
    </button>
  );
};

export default ConnectionStatus;

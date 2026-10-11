import React from 'react';
import useSessionStore from '@renderer/store/sessionStore';
import { connect } from '../../../helpers/ConnectionHelper';
import clsx from 'clsx';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [isConnected, isConnecting, isConnectionDegraded, callsign, isNetworkConnected] =
    useSessionStore((state) => [
      state.isConnected,
      state.isConnecting,
      state.isConnectionDegraded,
      state.callsign,
      state.isNetworkConnected
    ]);

  const handleConnectDisconnect = () => {
    if (isConnected) {
      void window.api.disconnect();
      return;
    }

    connect();
  };

  return (
    <button
      className={clsx(
        `toolbar-btn connection-status btn static-item px-2 d-flex flex-row main-status ${className}`,
        isConnected && !isConnectionDegraded && 'btn-danger',
        isConnected && isConnectionDegraded && 'btn-warning',
        isConnecting && 'btn-warning',
        !isConnected && !isConnecting && isNetworkConnected && 'btn-success'
      )}
      onClick={handleConnectDisconnect}
      disabled={!isNetworkConnected}
      title={isConnectionDegraded ? 'Voice connection quality is degraded' : undefined}
    >
      {isConnected && callsign
        ? isConnectionDegraded
          ? 'POOR CONNECTION'
          : 'DISCONNECT'
        : isConnecting
          ? 'CONNECTING'
          : callsign
            ? `CONNECT`
            : 'CONNECT'}
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

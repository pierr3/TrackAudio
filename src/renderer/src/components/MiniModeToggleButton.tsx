import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import React, { useCallback } from 'react';
import { Fullscreen, FullscreenExit } from 'react-bootstrap-icons';

interface MiniModeToggleButtonProps {
  showRestoreButton: boolean;
  alwaysEnabled?: boolean;
}

const MiniModeToggleButton: React.FC<MiniModeToggleButtonProps> = ({
  showRestoreButton,
  alwaysEnabled
}) => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const toggleMiniMode = useCallback(() => {
    if (!isConnected && !alwaysEnabled) return;
    window.api.toggleMiniMode(radios.filter((r) => r.rx).length).catch((error: unknown) => {
      console.error(error);
    });
  }, [radios, isConnected]);

  return (
    <button
      className="btn btn-primary"
      style={{ lineHeight: 0, fontSize: '14px' }}
      onClick={toggleMiniMode}
      disabled={!isConnected && !alwaysEnabled}
    >
      {showRestoreButton ? (
        <Fullscreen
          title={'Switch to large mode'}
          style={{ strokeWidth: '0.5px', stroke: 'white' }}
        />
      ) : (
        <FullscreenExit
          title={'Switch to mini mode'}
          style={{ strokeWidth: '0.5px', stroke: 'white' }}
        />
      )}
    </button>
  );
};

export default MiniModeToggleButton;

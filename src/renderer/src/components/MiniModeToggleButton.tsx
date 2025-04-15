import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import { Maximize, Minimize } from 'lucide-react';
import React, { useCallback } from 'react';

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
      style={{ lineHeight: 0, fontSize: '14px', zIndex: 10000 }}
      onClick={toggleMiniMode}
      disabled={!isConnected && !alwaysEnabled}
    >
      {showRestoreButton ? (
        <Maximize size={15} xlinkTitle="Switch to mini mode" />
      ) : (
        <Minimize size={15} xlinkTitle="Switch to mini mode" />
      )}
    </button>
  );
};

export default MiniModeToggleButton;

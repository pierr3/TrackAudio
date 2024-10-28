import useRadioState from '@renderer/store/radioStore';
import React, { useCallback } from 'react';
import { Fullscreen, FullscreenExit } from 'react-bootstrap-icons';

interface MiniModeToggleButtonProps {
  showRestoreButton: boolean;
}

const MiniModeToggleButton: React.FC<MiniModeToggleButtonProps> = ({ showRestoreButton }) => {
  const [radios] = useRadioState((state) => [state.radios]);
  const toggleMiniMode = useCallback(() => {
    window.api.toggleMiniMode(radios.filter((r) => r.rx).length).catch((error: unknown) => {
      console.error(error);
    });
  }, [radios]);

  return (
    <button
      className="btn btn-primary"
      style={{ lineHeight: 0, fontSize: '14px' }}
      onClick={toggleMiniMode}
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

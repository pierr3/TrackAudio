import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';

const useMiniModeManager = () => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const [platform] = useUtilStore((state) => [state.platform]);
  const [transparencyMiniMode] = useUtilStore((state) => [state.transparentMiniMode]);

  const isMiniMode = useMediaQuery({ maxWidth: '455px' });
  const isApproachingMiniMode = useMediaQuery({ maxWidth: '560px', maxHeight: '240px' });

  const [previousWindowState, setPreviousWindowState] = useState({
    wasConnected: false,
    wasInMiniMode: false,
    wasApproachingMini: false
  });

  const REGULAR_SIZE = { width: 530, height: 240 };
  const MINI_SIZE = { width: 250, height: 120 };

  const calculateMiniModeHeight = () => {
    const activeRadios = radios.filter((r) => r.rx).length;
    return 22 + 24 * Math.max(activeRadios, 1);
  };

  const updateWindowSize = (width, height) => {
    window.api.window.setMinimumSize(width as number, height as number);
  };

  const updateWindowAppearance = (inMiniMode) => {
    if (platform === 'darwin') {
      window.api.window.setWindowButtonVisibility(!inMiniMode);
    }

    document.body.style.backgroundColor =
      inMiniMode && transparencyMiniMode ? 'transparent' : '#2c2f45';
  };

  useEffect(() => {
    const handleWindowStateChange = () => {
      // Case 1: Connection state change
      // if (isConnected !== previousWindowState.wasConnected) {
      //   console.log('Case 1');
      //   updateWindowSize(
      //     isConnected ? MINI_SIZE.width : REGULAR_SIZE.width,
      //     isConnected ? MINI_SIZE.height : REGULAR_SIZE.height
      //   );
      //   setPreviousWindowState((prev) => ({ ...prev, wasConnected: isConnected }));
      // }

      // // Case 2: User is approaching mini mode // Fix this
      // if (isApproachingMiniMode && isConnected && !isMiniMode) {
      //   console.log('Case 2', MINI_SIZE.width, MINI_SIZE.height);
      //   updateWindowSize(MINI_SIZE.width, MINI_SIZE.height);
      // }

      // Case 3: User has entered mini mode
      if (isMiniMode && !previousWindowState.wasInMiniMode) {
        const miniHeight = calculateMiniModeHeight();

        updateWindowSize(MINI_SIZE.width, miniHeight);
        updateWindowAppearance(true);
        setPreviousWindowState((prev) => ({ ...prev, wasInMiniMode: true }));
      }

      // Case 4: User has exited mini mode
      if (!isMiniMode && previousWindowState.wasInMiniMode) {
        updateWindowSize(MINI_SIZE.width, MINI_SIZE.height);
        updateWindowAppearance(false);
        setPreviousWindowState((prev) => ({ ...prev, wasInMiniMode: false }));
      }
    };

    handleWindowStateChange();
  }, [
    isConnected,
    isMiniMode,
    isApproachingMiniMode,
    radios,
    platform,
    transparencyMiniMode,
    previousWindowState
  ]);

  return {
    isMiniMode,
    isApproachingMiniMode,
    isConnected
  };
};

export default useMiniModeManager;

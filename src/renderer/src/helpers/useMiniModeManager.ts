import { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';

// Constants for window dimensions
const WINDOW_DIMENSIONS = {
  MINI: {
    WIDTH: 250,
    MIN_HEIGHT: 42,
    BASE_HEIGHT: 22,
    RADIO_HEIGHT: 24
  },
  REGULAR: {
    MIN_WIDTH: 455,
    MIN_HEIGHT: 120
  },
  BREAKPOINTS: {
    MINI_MODE: 455,
    APPROACHING_MINI: 560
  }
} as const;

const useMiniModeManager = () => {
  const [radios] = useRadioState((state) => [state.radios]);
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const [platform, transparentMiniMode] = useUtilStore((state) => [
    state.platform,
    state.transparentMiniMode
  ]);

  // State to track window dimensions and mode
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Use media queries for responsive breakpoints
  const isMiniMode = useMediaQuery({
    maxWidth: WINDOW_DIMENSIONS.BREAKPOINTS.MINI_MODE
  });

  const isApproachingMiniMode = useMediaQuery({
    maxWidth: WINDOW_DIMENSIONS.BREAKPOINTS.APPROACHING_MINI,
    maxHeight: WINDOW_DIMENSIONS.REGULAR.MIN_HEIGHT * 2
  });

  // Calculate mini mode height based on active radios
  const calculateMiniModeHeight = useCallback(() => {
    const activeRadios = radios.filter((r) => r.rx).length;
    const numRadios = Math.max(activeRadios, 1);
    return WINDOW_DIMENSIONS.MINI.BASE_HEIGHT + WINDOW_DIMENSIONS.MINI.RADIO_HEIGHT * numRadios;
  }, [radios]);

  // Update window size constraints
  const updateWindowConstraints = useCallback(
    (miniMode: boolean) => {
      if (miniMode) {
        const miniHeight = calculateMiniModeHeight();
        window.api.window.setMinimumSize(
          WINDOW_DIMENSIONS.MINI.WIDTH,
          Math.max(miniHeight, WINDOW_DIMENSIONS.MINI.MIN_HEIGHT)
        );
      } else {
        window.api.window.setMinimumSize(
          WINDOW_DIMENSIONS.REGULAR.MIN_WIDTH,
          WINDOW_DIMENSIONS.REGULAR.MIN_HEIGHT
        );
      }
    },
    [calculateMiniModeHeight]
  );

  // Update window appearance for mini mode
  const updateWindowAppearance = useCallback(
    (miniMode: boolean) => {
      if (platform === 'darwin') {
        window.api.window.setWindowButtonVisibility(!miniMode);
      }

      // Set background transparency
      document.body.style.backgroundColor =
        miniMode && transparentMiniMode ? 'transparent' : '#2c2f45';
    },
    [platform, transparentMiniMode]
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle mini mode transitions
  useEffect(() => {
    const handleMiniModeTransition = () => {
      try {
        updateWindowConstraints(isMiniMode);
        updateWindowAppearance(isMiniMode);

        // If approaching mini mode, prepare constraints
        if (isApproachingMiniMode && !isMiniMode) {
          window.api.window.setMinimumSize(
            WINDOW_DIMENSIONS.MINI.WIDTH,
            WINDOW_DIMENSIONS.MINI.MIN_HEIGHT
          );
        }

        // Log for debugging
        console.debug('Mini mode transition:', {
          isMiniMode,
          isApproachingMini: isApproachingMiniMode,
          dimensions: windowDimensions,
          calculatedHeight: calculateMiniModeHeight()
        });
      } catch (error) {
        console.error('Error during mini mode transition:', error);
      }
    };

    handleMiniModeTransition();
  }, [
    isMiniMode,
    isApproachingMiniMode,
    windowDimensions,
    updateWindowConstraints,
    updateWindowAppearance,
    calculateMiniModeHeight
  ]);

  // Handle active radio count changes
  useEffect(() => {
    if (isMiniMode) {
      updateWindowConstraints(true);
    }
  }, [radios, isMiniMode, updateWindowConstraints]);

  return {
    isMiniMode,
    isApproachingMiniMode,
    isConnected,
    windowDimensions
  };
};

export default useMiniModeManager;

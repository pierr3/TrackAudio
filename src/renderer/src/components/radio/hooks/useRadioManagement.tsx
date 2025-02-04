import { useState, useCallback, useRef, useEffect } from 'react';
import useRadioState, { RadioType } from '@renderer/store/radioStore';
import useErrorStore from '@renderer/store/errorStore';

// Hook for managing frequency display and aliases
export const useFrequencyDisplay = (radio: RadioType) => {
  const [isHoveringFrequency, setIsHoveringFrequency] = useState(false);
  const [showAliasFrequency, setShowAliasFrequency] = useState(false);
  const [canToggleOnHover, setCanToggleOnHover] = useState(true);

  // Memoize handlers to prevent unnecessary re-renders
  const handleMouseEnterFrequency = useCallback(() => {
    if (radio.humanFrequencyAlias) {
      setIsHoveringFrequency(true);
    }
  }, [radio.humanFrequencyAlias]);

  const handleMouseLeaveFrequency = useCallback(() => {
    setCanToggleOnHover(true);
    setIsHoveringFrequency(false);
  }, []);

  // Memoize the display info calculation
  const getDisplayFrequencyInfo = useCallback(() => {
    if (!radio.humanFrequencyAlias) {
      return {
        displayValue: radio.humanFrequency,
        isShowingAlias: false
      };
    }

    if (isHoveringFrequency && canToggleOnHover) {
      return {
        displayValue: showAliasFrequency ? radio.humanFrequency : radio.humanFrequencyAlias,
        isShowingAlias: !showAliasFrequency
      };
    }

    return {
      displayValue: showAliasFrequency ? radio.humanFrequencyAlias : radio.humanFrequency,
      isShowingAlias: showAliasFrequency
    };
  }, [
    radio.humanFrequencyAlias,
    radio.humanFrequency,
    isHoveringFrequency,
    canToggleOnHover,
    showAliasFrequency
  ]);

  return {
    isHoveringFrequency,
    showAliasFrequency,
    canToggleOnHover,
    setShowAliasFrequency,
    setCanToggleOnHover,
    handleMouseEnterFrequency,
    handleMouseLeaveFrequency,
    getDisplayFrequencyInfo
  };
};

export const useRadioStateManagement = (radio: RadioType) => {
  const postError = useErrorStore((state) => state.postError);
  const [setRadioState, removeRadio] = useRadioState((state) => [
    state.setRadioState,
    state.removeRadio
  ]);

  // Use a ref to track pending updates
  const pendingUpdateRef = useRef(false);

  const updateRadioState = useCallback(
    async (
      newState: {
        rx?: boolean;
        tx?: boolean;
        xc?: boolean;
        crossCoupleAcross?: boolean;
        onSpeaker?: boolean;
        isOutputMuted?: boolean;
        outputVolume?: number;
      },
      errorMessage: string,
      shouldRemoveOnError = false
    ) => {
      if (pendingUpdateRef.current) return false;

      try {
        pendingUpdateRef.current = true;

        const ret = await window.api.setFrequencyState(
          radio.callsign,
          radio.frequency,
          newState.rx ?? radio.rx,
          newState.tx ?? radio.tx,
          newState.xc ?? radio.xc,
          newState.onSpeaker ?? radio.onSpeaker,
          newState.crossCoupleAcross ?? radio.crossCoupleAcross,
          newState.isOutputMuted ?? radio.isOutputMuted,
          newState.outputVolume ?? radio.outputVolume
        );

        if (!ret) {
          postError(`Invalid action on invalid radio: ${errorMessage}`);
          if (shouldRemoveOnError) {
            removeRadio(radio.frequency);
          }
          pendingUpdateRef.current = false;
          return false;
        }

        setTimeout(() => {
          setRadioState(radio.frequency, {
            ...radio,
            ...newState
          });
          pendingUpdateRef.current = false;
        }, 0);

        return true;
      } catch (err) {
        console.error(err);
        pendingUpdateRef.current = false;
        return false;
      }
    },
    [radio, setRadioState, removeRadio, postError]
  );

  const toggleRx = useCallback(async () => {
    const newState = !radio.rx;
    return updateRadioState(
      {
        rx: newState,
        tx: !newState ? false : radio.tx,
        xc: !newState ? false : radio.xc,
        crossCoupleAcross: !newState ? false : radio.crossCoupleAcross
      },
      'RX.',
      true
    );
  }, [radio, updateRadioState]);

  const toggleTx = useCallback(async () => {
    const newTxState = !radio.tx;
    return updateRadioState(
      {
        rx: !radio.rx && newTxState ? true : radio.rx,
        tx: newTxState,
        xc: !newTxState ? false : radio.xc,
        crossCoupleAcross: !newTxState ? false : radio.crossCoupleAcross
      },
      'TX.'
    );
  }, [radio, updateRadioState]);

  const toggleXc = useCallback(async () => {
    const newState = !radio.xc;
    return updateRadioState(
      {
        rx: !radio.rx && newState ? true : radio.rx,
        tx: !radio.tx && newState ? true : radio.tx,
        xc: newState,
        crossCoupleAcross: false
      },
      'XC.'
    );
  }, [radio, updateRadioState]);

  const toggleCrossCoupleAcross = useCallback(async () => {
    const newState = !radio.crossCoupleAcross;
    return updateRadioState(
      {
        rx: !radio.rx && newState ? true : radio.rx,
        tx: !radio.tx && newState ? true : radio.tx,
        xc: false,
        crossCoupleAcross: newState
      },
      'XC across.'
    );
  }, [radio, updateRadioState]);

  const toggleSpeaker = useCallback(async () => {
    const newState = !radio.onSpeaker;
    return updateRadioState(
      {
        onSpeaker: newState
      },
      'OnSPK.',
      true
    );
  }, [radio, updateRadioState]);

  const toggleMute = useCallback(async () => {
    const newState = !radio.isOutputMuted;
    return updateRadioState(
      {
        isOutputMuted: newState
      },
      'Mute.',
      true
    );
  }, [radio, updateRadioState]);

  // Cleanup pending updates on unmount
  useEffect(() => {
    return () => {
      pendingUpdateRef.current = false;
    };
  }, []);

  return {
    toggleRx,
    toggleTx,
    toggleXc,
    toggleCrossCoupleAcross,
    toggleSpeaker,
    toggleMute
  };
};
// Hook for managing radio deletion
export const useRadioDeletion = () => {
  const removeRadio = useRadioState((state) => state.removeRadio);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const awaitEndOfRxForDeletion = useCallback(
    (frequency: number): void => {
      // Clear any existing intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const radio = useRadioState.getState().radios.find((r) => r.frequency === frequency);
        if (!radio) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        if (!radio.currentlyRx && !radio.currentlyTx) {
          void window.api.removeFrequency(radio.frequency, radio.callsign);
          removeRadio(radio.frequency);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 60);

      // Clear any existing timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }, 10000);
    },
    [removeRadio]
  );

  // Cleanup intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    awaitEndOfRxForDeletion
  };
};

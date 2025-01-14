import useRadioState from '@renderer/store/radioStore';
import useUtilStore from '@renderer/store/utilStore';
import { useState, useRef, useEffect, useCallback } from 'react';

interface UseVolumeManagementProps {
  radio: {
    frequency: number;
    callsign: string;
    tx: boolean;
    isOutputMuted: boolean;
    outputVolume: number;
  };
}

interface UseVolumeManagementReturn {
  localVolume: number;
  handleVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleVolumeWheel: (event: React.WheelEvent<HTMLInputElement>) => void;
  isManualMode: boolean;
}

export const useVolumeManagement = ({
  radio
}: UseVolumeManagementProps): UseVolumeManagementReturn => {
  const [localVolume, setLocalVolume] = useState(100);
  const [isManualMode, setIsManualMode] = useState(false);
  const isInternalUpdate = useRef(false);
  const previousTxState = useRef(radio.tx);
  const previousVolumeRef = useRef(radio.outputVolume);

  const setOutputVolume = useRadioState((state) => state.setOutputVolume);
  const radioToMaxVolumeOnTX = useUtilStore((state) => state.radioToMaxVolumeOnTX);

  // Initialize volume from localStorage
  useEffect(() => {
    const storedVolume = window.localStorage.getItem(radio.callsign + 'StationVolume');
    const initialVolume = storedVolume ? parseInt(storedVolume) : 100;
    isInternalUpdate.current = true;
    setLocalVolume(initialVolume);
    isInternalUpdate.current = false;
  }, [radio.callsign]);

  // Handle TX state changes
  useEffect(() => {
    if (!radioToMaxVolumeOnTX) return;

    const handleTxChange = async () => {
      // TX was turned on
      if (radio.tx && !previousTxState.current) {
        const previousVolume = window.localStorage.getItem(radio.callsign + 'StationVolume');
        if (previousVolume) {
          window.localStorage.setItem(radio.callsign + 'StationVolume', previousVolume);
        }

        isInternalUpdate.current = true;
        setLocalVolume(100);
        setOutputVolume(radio.frequency, 100);

        try {
          await window.api.SetFrequencyRadioVolume(radio.frequency, 100);
        } catch (err) {
          console.error('Failed to set volume:', err);
        } finally {
          isInternalUpdate.current = false;
        }
      }
      // TX was turned off
      else if (!radio.tx && previousTxState.current) {
        // Reset manual mode when TX is turned off
        setIsManualMode(false);

        // Only restore volume if we weren't in manual mode
        if (!isManualMode) {
          const storedVolume = window.localStorage.getItem(radio.callsign + 'StationVolume');
          const volumeToRestore = storedVolume ? parseInt(storedVolume) : 100;

          isInternalUpdate.current = true;
          setLocalVolume(volumeToRestore);
          setOutputVolume(radio.frequency, volumeToRestore);

          try {
            await window.api.SetFrequencyRadioVolume(radio.frequency, volumeToRestore);
          } catch (err) {
            console.error('Failed to restore volume:', err);
          } finally {
            isInternalUpdate.current = false;
          }
        }
      }
    };

    void handleTxChange();
    previousTxState.current = radio.tx;
  }, [
    radio.tx,
    radio.frequency,
    radio.callsign,
    radioToMaxVolumeOnTX,
    isManualMode,
    setOutputVolume
  ]);

  // Detect and handle external volume changes
  useEffect(() => {
    if (radio.outputVolume !== previousVolumeRef.current) {
      // If this is an external change (not triggered by our internal updates)
      if (!isInternalUpdate.current) {
        // Enter manual mode if we're in TX and volume changed
        if (radio.tx && radioToMaxVolumeOnTX) {
          setIsManualMode(true);
        }

        const currentStoredVolume = window.localStorage.getItem(radio.callsign + 'StationVolume');
        const storedVolumeNum = currentStoredVolume ? parseInt(currentStoredVolume) : null;

        if (storedVolumeNum !== radio.outputVolume) {
          window.localStorage.setItem(
            radio.callsign + 'StationVolume',
            radio.outputVolume.toString()
          );
        }

        isInternalUpdate.current = true;
        setLocalVolume(radio.outputVolume);
        isInternalUpdate.current = false;
      }

      previousVolumeRef.current = radio.outputVolume;
    }
  }, [radio.outputVolume, radio.callsign, radio.tx, radioToMaxVolumeOnTX]);

  const handleVolumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = event.target.valueAsNumber;

      // If we're in TX mode, switch to manual mode
      if (radio.tx && radioToMaxVolumeOnTX) {
        setIsManualMode(true);
      }

      isInternalUpdate.current = true;
      setLocalVolume(newVolume);
      setOutputVolume(radio.frequency, newVolume);
      window.localStorage.setItem(radio.callsign + 'StationVolume', newVolume.toString());

      if (!radio.isOutputMuted) {
        window.api
          .SetFrequencyRadioVolume(radio.frequency, newVolume)
          .catch((err: unknown) => {
            console.error('Failed to set volume:', err);
          })
          .finally(() => {
            isInternalUpdate.current = false;
          });
      } else {
        isInternalUpdate.current = false;
      }
    },
    [
      radio.tx,
      radio.frequency,
      radio.callsign,
      radio.isOutputMuted,
      radioToMaxVolumeOnTX,
      setOutputVolume
    ]
  );

  const handleVolumeWheel = useCallback(
    (event: React.WheelEvent<HTMLInputElement>) => {
      const newVolume = Math.min(Math.max(localVolume + (event.deltaY > 0 ? -1 : 1), 0), 100);

      // If we're in TX mode, switch to manual mode
      if (radio.tx && radioToMaxVolumeOnTX) {
        setIsManualMode(true);
      }

      isInternalUpdate.current = true;
      setLocalVolume(newVolume);
      setOutputVolume(radio.frequency, newVolume);
      window.localStorage.setItem(radio.callsign + 'StationVolume', newVolume.toString());

      if (!radio.isOutputMuted) {
        window.api
          .SetFrequencyRadioVolume(radio.frequency, newVolume)
          .catch((err: unknown) => {
            console.error('Failed to set volume:', err);
          })
          .finally(() => {
            isInternalUpdate.current = false;
          });
      } else {
        isInternalUpdate.current = false;
      }
    },
    [
      localVolume,
      radio.tx,
      radio.frequency,
      radio.callsign,
      radio.isOutputMuted,
      radioToMaxVolumeOnTX,
      setOutputVolume
    ]
  );

  return {
    localVolume,
    handleVolumeChange,
    handleVolumeWheel,
    isManualMode
  };
};

import React, { useState, useCallback, memo } from 'react';
import useRadioState, { RadioType } from '../../store/radioStore';
import useErrorStore from '../../store/errorStore';
import useSessionStore from '../../store/sessionStore';
import useUtilStore from '../../store/utilStore';
import { SlidersVertical, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import { useVolumeManagement } from './hooks/useVolumeManagement';

export interface RadioProps {
  radio: RadioType;
}

// Extract volume controls into a separate memoized component
const VolumeControls = memo(
  ({
    isManualMode,
    localVolume,
    onVolumeChange,
    onVolumeWheel,
    isOutputMuted,
    onToggleMute
  }: {
    isManualMode: boolean;
    localVolume: number;
    onVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onVolumeWheel: (event: React.WheelEvent<HTMLInputElement>) => void;
    isOutputMuted: boolean;
    onToggleMute: () => void;
  }) => (
    <div className="d-flex flex-row align-items-center px-3">
      <span
        className={clsx(
          'me-3 d-flex align-items-center',
          isManualMode ? 'text-warning' : 'text-white'
        )}
      >
        {isManualMode ? 'MANUAL' : 'VOLUME'}
      </span>
      <div className="flex-grow-1 d-flex align-items-center">
        <input
          type="range"
          className="form-range radio-text station-volume-bar w-100"
          min="0"
          max="100"
          step="1"
          value={localVolume}
          onChange={onVolumeChange}
          onWheel={onVolumeWheel}
        />
      </div>
      <button
        type="button"
        className={clsx(
          'radio-settings ms-2 d-flex align-items-center justify-content-center',
          isOutputMuted ? 'text-red' : 'text-muted'
        )}
        onClick={onToggleMute}
        title="Toggle mute output audio"
      >
        {isOutputMuted ? <VolumeX size={16} color="red" /> : <Volume2 size={16} />}
      </button>
    </div>
  )
);

VolumeControls.displayName = 'VolumeControls';

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const [isHoveringFrequency, setIsHoveringFrequency] = useState(false);
  const [showAliasFrequency, setShowAliasFrequency] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [canToggleOnHover, setCanToggleOnHover] = useState(true);

  // Get necessary state management functions
  const [setRadioState, selectRadio, removeRadio, setPendingDeletion, addOrRemoveRadioToBeDeleted] =
    useRadioState((state) => [
      state.setRadioState,
      state.selectRadio,
      state.removeRadio,
      state.setPendingDeletion,
      state.addOrRemoveRadioToBeDeleted
    ]);

  const radiosToBeDeleted = useRadioState((state) => state.radiosSelected);
  const isEditMode = useUtilStore((state) => state.isEditMode);
  const isATC = useSessionStore((state) => state.isAtc);

  // Initialize volume management hook
  const { localVolume, handleVolumeChange, handleVolumeWheel, isManualMode } = useVolumeManagement({
    radio: {
      frequency: radio.frequency,
      callsign: radio.callsign,
      tx: radio.tx,
      isOutputMuted: radio.isOutputMuted,
      outputVolume: radio.outputVolume
    }
  });

  const getDisplayFrequencyInfo = () => {
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
  };

  const clickRadioHeader = useCallback(() => {
    if (isEditMode) {
      addOrRemoveRadioToBeDeleted(radio);
    } else if (radio.humanFrequencyAlias) {
      setShowAliasFrequency(!showAliasFrequency);
      setCanToggleOnHover(false);
    }
    selectRadio(radio.frequency);
    if (radio.transceiverCount === 0 && radio.callsign !== 'MANUAL') {
      void window.api.RefreshStation(radio.callsign);
    }
  }, [isEditMode, radio, addOrRemoveRadioToBeDeleted, selectRadio, showAliasFrequency]);

  const toggleMute = useCallback(() => {
    const newState = !radio.isOutputMuted;
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        radio.xc,
        radio.onSpeaker,
        radio.crossCoupleAcross,
        newState,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: Mute.');
          removeRadio(radio.frequency);
          return;
        }
        setRadioState(radio.frequency, {
          rx: radio.rx,
          tx: radio.tx,
          xc: radio.xc,
          crossCoupleAcross: radio.crossCoupleAcross,
          onSpeaker: radio.onSpeaker,
          outputVolume: radio.outputVolume,
          isOutputMuted: newState
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [radio, setRadioState, removeRadio, postError]);

  const handleMouseEnterFrequency = () => {
    if (radio.humanFrequencyAlias) {
      setIsHoveringFrequency(true);
    }
  };

  const handleMouseLeaveFrequency = () => {
    setCanToggleOnHover(true);
    setIsHoveringFrequency(false);
  };

  const { displayValue } = getDisplayFrequencyInfo();

  const getFrequencyTypeDisplay = () => {
    if (!radio.humanFrequencyAlias) return null;

    if (isHoveringFrequency && canToggleOnHover) {
      return showAliasFrequency ? 'HF' : 'VHF';
    }

    return showAliasFrequency ? 'VHF' : 'HF';
  };

  const clickRx = useCallback(() => {
    clickRadioHeader();
    const newState = !radio.rx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState,
        newState ? radio.tx : false,
        newState ? radio.xc : false,
        radio.onSpeaker,
        newState ? radio.crossCoupleAcross : false,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: RX.');
          removeRadio(radio.frequency);
          return;
        }
        setRadioState(radio.frequency, {
          rx: newState,
          tx: !newState ? false : radio.tx,
          xc: !newState ? false : radio.xc,
          crossCoupleAcross: !newState ? false : radio.crossCoupleAcross,
          onSpeaker: radio.onSpeaker,
          outputVolume: radio.outputVolume,
          isOutputMuted: radio.isOutputMuted
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [radio, clickRadioHeader, setRadioState, removeRadio, postError]);

  const clickTx = useCallback(() => {
    const newState = !radio.tx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx,
        newState,
        !newState ? false : radio.xc,
        radio.onSpeaker,
        !newState ? false : radio.crossCoupleAcross,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: TX.');
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: newState,
          xc: !newState ? false : radio.xc,
          crossCoupleAcross: !newState ? false : radio.crossCoupleAcross,
          onSpeaker: radio.onSpeaker,
          outputVolume: radio.outputVolume,
          isOutputMuted: radio.isOutputMuted
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [radio, setRadioState, postError]);

  const clickXc = useCallback(() => {
    const newState = !radio.xc;
    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx,
        newState ? true : radio.tx,
        newState,
        radio.onSpeaker,
        false,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: XC.');
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: !radio.tx && newState ? true : radio.tx,
          xc: newState,
          crossCoupleAcross: false,
          onSpeaker: radio.onSpeaker,
          outputVolume: radio.outputVolume,
          isOutputMuted: radio.isOutputMuted
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [radio, setRadioState, postError]);

  const clickCrossCoupleAcross = useCallback(() => {
    const newState = !radio.crossCoupleAcross;
    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx,
        newState ? true : radio.tx,
        false,
        radio.onSpeaker,
        newState,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: XC across.');
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: !radio.tx && newState ? true : radio.tx,
          xc: false,
          crossCoupleAcross: newState,
          onSpeaker: radio.onSpeaker,
          outputVolume: radio.outputVolume,
          isOutputMuted: radio.isOutputMuted
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [radio, setRadioState, postError]);

  const clickSpK = useCallback(() => {
    const newState = !radio.onSpeaker;
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        radio.xc,
        newState,
        radio.crossCoupleAcross,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: OnSPK.');
          removeRadio(radio.frequency);
          return;
        }
        setRadioState(radio.frequency, {
          rx: radio.rx,
          tx: radio.tx,
          xc: radio.xc,
          crossCoupleAcross: radio.crossCoupleAcross,
          onSpeaker: newState,
          outputVolume: radio.outputVolume,
          isOutputMuted: radio.isOutputMuted
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [radio, setRadioState, removeRadio, postError]);

  const awaitEndOfRxForDeletion = useCallback(
    (frequency: number): void => {
      const interval = setInterval(
        (frequency: number) => {
          const radio = useRadioState.getState().radios.find((r) => r.frequency === frequency);
          if (!radio) {
            clearInterval(interval);
            return;
          }

          if (!radio.currentlyRx && !radio.currentlyTx) {
            void window.api.removeFrequency(radio.frequency);
            removeRadio(radio.frequency);
            clearInterval(interval);
          }
        },
        60,
        frequency
      );

      setTimeout(() => {
        clearInterval(interval);
      }, 10000);
    },
    [removeRadio]
  );

  const toggleSettings = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsSettingsOpen(!isSettingsOpen);
    },
    [isSettingsOpen]
  );

  return (
    <div
      style={{ position: 'relative' }}
      className={clsx(
        'radio ',
        isEditMode && radiosToBeDeleted.some((r) => r.frequency === radio.frequency) && 'bg-info',
        (radio.rx || radio.tx) && 'radio-active'
      )}
    >
      <div className="d-flex flex-column radio-sidebar">
        <button
          type="button"
          className={clsx(
            'radio-settings',
            isSettingsOpen && 'active',
            !isSettingsOpen && 'text-muted'
          )}
          onClick={toggleSettings}
          title="Adjust individual radio volume"
        >
          <SlidersVertical size={10} />
        </button>

        {!isSettingsOpen && radio.humanFrequencyAlias && (
          <div
            className={clsx('radio-alias-freq text-muted')}
            title="This radio has a paired frequency"
          >
            {getFrequencyTypeDisplay()}
          </div>
        )}
      </div>

      <div className={clsx('radio-settings-overlay', isSettingsOpen && 'active')}>
        {isSettingsOpen && (
          <VolumeControls
            isManualMode={isManualMode}
            localVolume={localVolume}
            onVolumeChange={handleVolumeChange}
            onVolumeWheel={handleVolumeWheel}
            isOutputMuted={radio.isOutputMuted}
            onToggleMute={toggleMute}
          />
        )}
      </div>

      <div className="radio-content">
        <div className="radio-left">
          <button
            className="btn-no-interact radio-header"
            onClick={clickRadioHeader}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                awaitEndOfRxForDeletion(radio.frequency);
                setPendingDeletion(radio.frequency, true);
              }
            }}
          >
            <div className="radio-text-container">
              <span
                className="frequency"
                onMouseEnter={handleMouseEnterFrequency}
                onMouseLeave={handleMouseLeaveFrequency}
              >
                {displayValue}
              </span>
              <span className="callsign text-muted">{radio.callsign}</span>
            </div>
          </button>

          <div className="radio-controls">
            <button
              className={clsx(
                'btn control-btn',
                !radio.xc && !radio.crossCoupleAcross && 'btn-primary',
                radio.xc && 'btn-success',
                radio.crossCoupleAcross && 'btn-warning'
              )}
              onClick={clickCrossCoupleAcross}
              onContextMenu={clickXc}
              disabled={!isATC}
            >
              {radio.xc ? 'XC' : 'XCA'}
            </button>

            <button
              className={clsx(
                'btn control-btn',
                !radio.onSpeaker && 'btn-primary',
                radio.onSpeaker && 'btn-success'
              )}
              onClick={clickSpK}
            >
              SPK
            </button>
          </div>
        </div>

        <div className="radio-right">
          <button
            className={clsx(
              'btn radio-button',
              radio.isOutputMuted && 'btn-danger',
              !radio.rx && !radio.isOutputMuted && 'btn-primary',
              radio.rx && !radio.isOutputMuted && radio.currentlyRx && 'btn-warning',
              radio.rx && !radio.isOutputMuted && !radio.currentlyRx && 'btn-success'
            )}
            onClick={clickRx}
            onContextMenu={toggleMute}
          >
            {radio.isOutputMuted ? <VolumeX size={16} /> : 'RX'}
          </button>

          <button
            className={clsx(
              'btn radio-button',
              !radio.tx && 'btn-primary',
              radio.tx && radio.currentlyTx && 'btn-warning',
              radio.tx && !radio.currentlyTx && 'btn-success'
            )}
            onClick={clickTx}
            disabled={!isATC}
          >
            TX
          </button>
        </div>
      </div>
    </div>
  );
};

export default Radio;

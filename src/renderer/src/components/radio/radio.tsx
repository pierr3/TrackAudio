import React, { useState, useCallback, memo } from 'react';
import useRadioState from '../../store/radioStore';
import useSessionStore from '../../store/sessionStore';
import useUtilStore from '../../store/utilStore';
import { SlidersVertical, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import { useVolumeManagement } from './hooks/useVolumeManagement';
import {
  useFrequencyDisplay,
  useRadioStateManagement,
  useRadioDeletion
} from './hooks/useRadioManagement';
import type { RadioType } from '../../store/radioStore';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get necessary state management functions
  const [selectRadio, addOrRemoveRadioToBeDeleted, setPendingDeletion] = useRadioState((state) => [
    state.selectRadio,
    state.addOrRemoveRadioToBeDeleted,
    state.setPendingDeletion
  ]);

  const radiosToBeDeleted = useRadioState((state) => state.radiosSelected);
  const isEditMode = useUtilStore((state) => state.isEditMode);
  const isATC = useSessionStore((state) => state.isAtc);

  // Use shared hooks
  const {
    handleMouseEnterFrequency,
    handleMouseLeaveFrequency,
    getDisplayFrequencyInfo,
    showAliasFrequency,
    setShowAliasFrequency,
    setCanToggleOnHover
  } = useFrequencyDisplay(radio);

  const { toggleRx, toggleTx, toggleMute, toggleXc, toggleCrossCoupleAcross, toggleSpeaker } =
    useRadioStateManagement(radio);

  const { awaitEndOfRxForDeletion } = useRadioDeletion();

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

  const clickRx = useCallback(() => {
    clickRadioHeader();
    void toggleRx();
  }, [clickRadioHeader, toggleRx]);

  const clickTx = useCallback(() => {
    if (!isATC) return;
    void toggleTx();
  }, [toggleTx, isATC]);

  const clickXcButton = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isATC) return;

      if (e.type === 'contextmenu') {
        void toggleXc();
      } else {
        void toggleCrossCoupleAcross();
      }
    },
    [isATC, toggleXc, toggleCrossCoupleAcross]
  );

  const toggleSettings = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsSettingsOpen(!isSettingsOpen);
    },
    [isSettingsOpen]
  );

  const { displayValue } = getDisplayFrequencyInfo();

  const getFrequencyTypeDisplay = useCallback(() => {
    if (!radio.humanFrequencyAlias) return null;
    return showAliasFrequency ? 'VHF' : 'HF';
  }, [radio.humanFrequencyAlias, showAliasFrequency]);

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
            onToggleMute={() => void toggleMute()}
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
              onClick={clickXcButton}
              onContextMenu={clickXcButton}
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
              onClick={() => void toggleSpeaker()}
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
            onContextMenu={(e) => {
              e.preventDefault();
              void toggleMute();
            }}
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

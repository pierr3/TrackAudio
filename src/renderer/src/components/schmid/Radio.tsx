import React, { FC, useCallback } from 'react';
import clsx from 'clsx';
import { VolumeX } from 'lucide-react';
import useRadioState, { RadioType } from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import { useVolumeManagement } from '../radio/hooks/useVolumeManagement';
import {
  useFrequencyDisplay,
  useRadioDeletion,
  useRadioStateManagement
} from '../radio/hooks/useRadioManagement';

const TOTAL_RADIO_SLOTS = 14;

// Base component stays the same
const BaseRadioChannel: FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={clsx('schmid-radio', className)}>
    <div className="schmid-radio-inner h-100">
      <div className="d-flex flex-column h-100">{children}</div>
    </div>
  </div>
);

// Active radio channel component using shared hooks
const ActiveRadioChannel: FC<{ radio: RadioType }> = ({ radio }) => {
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

  const { toggleRx, toggleTx, toggleMute } = useRadioStateManagement(radio);
  const { awaitEndOfRxForDeletion } = useRadioDeletion();

  // Initialize volume management hook
  useVolumeManagement({
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

  const { displayValue } = getDisplayFrequencyInfo();

  return (
    <BaseRadioChannel>
      <div className="col schmid-radio-border">
        <div className="schmid-row d-flex h-100">
          <div
            className={clsx(
              'col-4 schmid-radio-border-right d-flex justify-content-center align-items-center schmid-top-line',
              { active: radio.tx }
            )}
          >
            {radio.tx ? 'T' : 'M'}
          </div>
          <button
            className={clsx(
              'col-8 d-flex justify-content-center align-items-center schmid-clean-button schmid-top-line h-100',
              { active: radio.tx }
            )}
            onMouseEnter={handleMouseEnterFrequency}
            onMouseLeave={handleMouseLeaveFrequency}
          >
            {displayValue}
          </button>
        </div>
      </div>
      <div className="col schmid-radio-border w-100">
        <button
          className={clsx(
            {
              'schmid-radio-selected':
                isEditMode && radiosToBeDeleted.some((r) => r.frequency === radio.frequency)
            },
            'schmid-clean-button schmid-middle-line schmid-row d-flex justify-content-center align-items-center'
          )}
          onKeyDown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              awaitEndOfRxForDeletion(radio.frequency);
              setPendingDeletion(radio.frequency, true);
            }
          }}
          onClick={clickRadioHeader}
        >
          {radio.callsign}
        </button>
      </div>
      <div className="col schmid-radio-border">
        <div className="schmid-row d-flex h-100">
          <button
            className={clsx(
              'w-50 col-6 schmid-radio-border-right d-flex justify-content-center align-items-center text-black schmid-bottom-line',
              !radio.tx && 'primary',
              radio.tx && radio.currentlyTx && 'warning',
              radio.tx && !radio.currentlyTx && 'active'
            )}
            onClick={clickTx}
            disabled={!isATC}
          >
            Tx 1
          </button>
          <button
            className={clsx(
              'w-50 col-6 d-flex justify-content-center align-items-center text-black schmid-bottom-line',
              radio.isOutputMuted && 'danger',
              !radio.rx && !radio.isOutputMuted && 'primary',
              radio.rx && !radio.isOutputMuted && radio.currentlyRx && 'warning',
              radio.rx && !radio.isOutputMuted && !radio.currentlyRx && 'active'
            )}
            onClick={clickRx}
            onContextMenu={() => void toggleMute()}
          >
            {radio.isOutputMuted ? <VolumeX size={16} /> : 'Rx 1'}
          </button>
        </div>
      </div>
    </BaseRadioChannel>
  );
};

// Placeholder radio channel component
const PlaceholderRadioChannel: FC = () => (
  <BaseRadioChannel className="schmid-radio-disabled">
    <div className="col schmid-radio-border">
      <div className="schmid-row d-flex h-100">
        <div className="col-4 schmid-radio-border-right d-flex justify-content-center align-items-center schmid-top-line" />
        <div className="col-8 d-flex justify-content-center align-items-center schmid-top-line" />
      </div>
    </div>
    <div className="col schmid-radio-border">
      <div className="schmid-row d-flex justify-content-center align-items-center schmid-middle-line" />
    </div>
    <div className="col schmid-radio-border">
      <div className="schmid-row d-flex h-100">
        <div className="col-6 schmid-radio-border-right d-flex justify-content-center align-items-center" />
        <div className="col-6 d-flex justify-content-center align-items-center" />
      </div>
    </div>
  </BaseRadioChannel>
);

// Grid hook for managing radio channels
const useRadioChannelsGrid = () => {
  const radios = useRadioState((state) => state.radios);
  const remainingSlots = Math.max(0, TOTAL_RADIO_SLOTS - radios.length);

  return (
    <>
      {radios.map((radio) => (
        <div key={`active-${radio.frequency.toString()}`} className="col-6">
          <ActiveRadioChannel radio={radio} />
        </div>
      ))}
      {Array.from({ length: remainingSlots }).map((_, index) => (
        <div key={`placeholder-${index.toString()}`} className="col-6">
          <PlaceholderRadioChannel />
        </div>
      ))}
    </>
  );
};

export { useRadioChannelsGrid };

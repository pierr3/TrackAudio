import React, { FC, useState, useCallback } from 'react';
import clsx from 'clsx';
import useRadioState, { RadioType } from '@renderer/store/radioStore';
import useErrorStore from '@renderer/store/errorStore';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import { VolumeX } from 'lucide-react';
import { useVolumeManagement } from '../radio/hooks/useVolumeManagement';

const TOTAL_RADIO_SLOTS = 14;

// // Volume Controls component remains the same
// const VolumeControls = memo(
//   ({ isManualMode, localVolume, onVolumeChange, onVolumeWheel, isOutputMuted, onToggleMute }) => (
//     <div className="d-flex flex-row align-items-center px-3">
//       <span
//         className={clsx(
//           'me-3 d-flex align-items-center',
//           isManualMode ? 'text-warning' : 'text-white'
//         )}
//       >
//         {isManualMode ? 'MANUAL' : 'VOLUME'}
//       </span>
//       <div className="flex-grow-1 d-flex align-items-center">
//         <input
//           type="range"
//           className="form-range radio-text station-volume-bar w-100"
//           min="0"
//           max="100"
//           step="1"
//           value={localVolume}
//           onChange={onVolumeChange}
//           onWheel={onVolumeWheel}
//         />
//       </div>
//       <button
//         type="button"
//         className={clsx(
//           'radio-settings ms-2 d-flex align-items-center justify-content-center',
//           isOutputMuted ? 'text-red' : 'text-muted'
//         )}
//         onClick={onToggleMute}
//         title="Toggle mute output audio"
//       >
//         {isOutputMuted ? <VolumeX size={16} color="red" /> : <Volume2 size={16} />}
//       </button>
//     </div>
//   )
// );

// VolumeControls.displayName = 'VolumeControls';

// Base component stays exactly the same
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

// Active radio channel component with functionality but keeping exact UI
const ActiveRadioChannel: FC<{ radio: RadioType }> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  // const [isHoveringFrequency, setIsHoveringFrequency] = useState(false);
  // const [showAliasFrequency, setShowAliasFrequency] = useState(false);
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // const [canToggleOnHover, setCanToggleOnHover] = useState(true);
  const [canToggleOnHover, setCanToggleOnHover] = useState(true);
  const [isHoveringFrequency, setIsHoveringFrequency] = useState(false);
  const [showAliasFrequency, setShowAliasFrequency] = useState(false);
  const radiosToBeDeleted = useRadioState((state) => state.radiosSelected);

  const [setRadioState, selectRadio, removeRadio, setPendingDeletion, addOrRemoveRadioToBeDeleted] =
    useRadioState((state) => [
      state.setRadioState,
      state.selectRadio,
      state.removeRadio,
      state.setPendingDeletion,
      state.addOrRemoveRadioToBeDeleted
    ]);

  const isEditMode = useUtilStore((state) => state.isEditMode);
  const isATC = useSessionStore((state) => state.isAtc);
  // const { localVolume, handleVolumeChange, handleVolumeWheel, isManualMode } = useVolumeManagement({
  //   radio: {
  //     frequency: radio.frequency,
  //     callsign: radio.callsign,
  //     tx: radio.tx,
  //     isOutputMuted: radio.isOutputMuted,
  //     outputVolume: radio.outputVolume
  //   }
  // });

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

  const handleMouseEnterFrequency = () => {
    if (radio.humanFrequencyAlias) {
      setIsHoveringFrequency(true);
    }
  };

  const handleMouseLeaveFrequency = () => {
    setCanToggleOnHover(true);
    setIsHoveringFrequency(false);
  };

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
            void window.api.removeFrequency(radio.frequency, radio.callsign);
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

  useVolumeManagement({
    radio: {
      frequency: radio.frequency,
      callsign: radio.callsign,
      tx: radio.tx,
      isOutputMuted: radio.isOutputMuted,
      outputVolume: radio.outputVolume
    }
  });

  const clickRx = useCallback(() => {
    clickRadioHeader();
    const newState = !radio.rx;
    window.api
      .setFrequencyState(
        radio.callsign,
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
  }, [radio, setRadioState, removeRadio, postError]);

  const clickTx = useCallback(() => {
    if (!isATC) return;

    const newState = !radio.tx;
    window.api
      .setFrequencyState(
        radio.callsign,
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
  }, [radio, setRadioState, postError, isATC]);

  const toggleMute = useCallback(() => {
    const newState = !radio.isOutputMuted;
    window.api
      .setFrequencyState(
        radio.callsign,
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
  const { displayValue } = getDisplayFrequencyInfo();

  // Keeping exact UI structure while adding functionality
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
            'schmid-clean-button schmid-middle-line schmid-row d-flex justify-content-center align-items-center '
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
            onContextMenu={toggleMute}
          >
            {radio.isOutputMuted ? <VolumeX size={16} /> : 'Rx 1'}
          </button>
        </div>
      </div>
    </BaseRadioChannel>
  );
};

// Placeholder stays exactly the same
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

// Grid hook stays exactly the same
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

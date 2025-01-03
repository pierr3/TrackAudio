import React, { useEffect, useState } from 'react';
import useRadioState, { RadioType } from '../../store/radioStore';
import clsx from 'clsx';
import useErrorStore from '../../store/errorStore';
import useSessionStore from '../../store/sessionStore';
import useUtilStore from '../../store/utilStore';
import { Sliders2, VolumeMute, VolumeUp } from 'react-bootstrap-icons';

export interface RadioProps {
  radio: RadioType;
}

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const [
    setRadioState,
    selectRadio,
    removeRadio,
    setPendingDeletion,
    addOrRemoveRadioToBeDeleted,
    radiosToBeDeleted,
    setOutputVolume
  ] = useRadioState((state) => [
    state.setRadioState,
    state.selectRadio,
    state.removeRadio,
    state.setPendingDeletion,
    state.addOrRemoveRadioToBeDeleted,
    state.radiosSelected,
    state.setOutputVolume
  ]);
  const [isEditMode] = useUtilStore((state) => [state.isEditMode]);
  const isATC = useSessionStore((state) => state.isAtc);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const updateStationVolumeValue = (newStationVolume: number) => {
    if (radio.isOutputMuted) {
      toggleMute();
    }

    window.api.SetFrequencyRadioVolume(radio.frequency, newStationVolume).catch((err: unknown) => {
      console.error(err);
    });
  };

  useEffect(() => {
    if (!radio.tx && initialised) {
      window.localStorage.setItem(radio.callsign + 'StationVolume', radio.outputVolume.toString());
    }
  }, [radio.outputVolume, radio.callsign]);

  useEffect(() => {
    if (radio.tx) {
      forceToMainVolume();
    } else {
      setStoredStationVolume();
    }
  }, [radio.tx]);

  useEffect(() => {
    setStoredStationVolume();
    setInitialised(true);
  }, []);

  const forceToMainVolume = () => {
    // setLocalStationVolume(radio.frequency);
    updateStationVolumeValue(100);
  };

  const setStoredStationVolume = () => {
    const storedStationVolume = window.localStorage.getItem(radio.callsign + 'StationVolume');
    const storedStationVolumeInt = storedStationVolume ? parseInt(storedStationVolume) : null;
    if (storedStationVolumeInt) {
      setOutputVolume(radio.frequency, storedStationVolumeInt);
      updateStationVolumeValue(storedStationVolumeInt);
    }
  };

  const handleStationVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateStationVolumeValue(event.target.valueAsNumber);
  };

  const handleStationVolumeMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(Math.max(radio.outputVolume + (event.deltaY > 0 ? -1 : 1), 0), 100);

    updateStationVolumeValue(newValue);
  };

  const clickRadioHeader = () => {
    if (isEditMode) {
      addOrRemoveRadioToBeDeleted(radio);
    }
    selectRadio(radio.frequency);
    if (radio.transceiverCount === 0 && radio.callsign !== 'MANUAL') {
      void window.api.RefreshStation(radio.callsign);
    }
  };

  const clickRx = () => {
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
  };

  const clickTx = () => {
    const newState = !radio.tx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If tx is true, rx must be true
        newState,
        !newState ? false : radio.xc, // If tx is false, xc must be false
        radio.onSpeaker,
        !newState ? false : radio.crossCoupleAcross,
        radio.isOutputMuted,
        radio.outputVolume // If tx is false, crossCoupleAcross must be false
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
  };

  const clickXc = () => {
    const newState = !radio.xc;
    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If xc is true, rx must be true
        newState ? true : radio.tx, // If xc is true, tx must be true
        newState,
        radio.onSpeaker,
        false,
        radio.isOutputMuted,
        radio.outputVolume // If xc is true, crossCoupleAcross must be false
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
  };

  const clickCrossCoupleAcross = () => {
    const newState = !radio.crossCoupleAcross;
    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If crossCoupleAcross is true, rx must be true
        newState ? true : radio.tx, // If crossCoupleAcross is true, tx must be true
        false, // If crossCoupleAcross is true, xc must be false
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
  };

  const clickSpK = () => {
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
  };

  const toggleMute = () => {
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
  };

  const awaitEndOfRxForDeletion = (frequency: number): void => {
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

    // Clear the interval after 5 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);
  };

  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <div
      style={{ position: 'relative' }}
      className={clsx(
        'radio',
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
          <Sliders2 />
        </button>
      </div>

      <div className={clsx('radio-settings-overlay', isSettingsOpen && 'active')}>
        {/* Add your settings content here */}
        <div className="d-flex flex-row align-items-center px-3">
          <span className="me-3 text-white d-flex align-items-center">VOLUME</span>

          <div className="flex-grow-1 d-flex align-items-center">
            <input
              type="range"
              className="form-range radio-text station-volume-bar w-100"
              disabled={radio.tx}
              min="0"
              max="100"
              step="1"
              value={radio.outputVolume}
              onChange={handleStationVolumeChange}
              onWheel={handleStationVolumeMouseWheel}
            />
          </div>

          <button
            type="button"
            className={clsx(
              'radio-settings ms-2 d-flex align-items-center justify-content-center',
              radio.isOutputMuted ? 'text-red' : 'text-muted'
            )}
            onClick={toggleMute}
            title="Toggle mute output audio"
          >
            {radio.isOutputMuted ? <VolumeMute size={18} color="red" /> : <VolumeUp size={18} />}
          </button>
        </div>
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
              <span className="frequency">{radio.humanFrequency}</span>
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
            RX
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

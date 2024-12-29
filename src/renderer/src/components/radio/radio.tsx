import React, { useEffect, useState } from 'react';
import useRadioState, { RadioType } from '../../store/radioStore';
import clsx from 'clsx';
import useErrorStore from '../../store/errorStore';
import useSessionStore from '../../store/sessionStore';
import useUtilStore from '../../store/utilStore';
import { Sliders2, XCircle } from 'react-bootstrap-icons';

export interface RadioProps {
  radio: RadioType;
}

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const [isHoveringFrequency, setIsHoveringFrequency] = useState(false);
  const [showAliasFrequency, setShowAliasFrequency] = useState(false);
  const [radioGain] = useSessionStore((state) => [state.radioGain]);

  const [
    setRadioState,
    setIndividualRadioGain,
    resetIndividualRadioGain,
    selectRadio,
    removeRadio,
    setPendingDeletion,
    addOrRemoveRadioToBeDeleted,
    radiosToBeDeleted
  ] = useRadioState((state) => [
    state.setRadioState,
    state.setIndividualRadioGain,
    state.resetIndividualRadioGain,
    state.selectRadio,
    state.removeRadio,
    state.setPendingDeletion,
    state.addOrRemoveRadioToBeDeleted,
    state.radiosSelected
  ]);
  const [isEditMode] = useUtilStore((state) => [state.isEditMode]);
  const isATC = useSessionStore((state) => state.isAtc);
  const [canToggleOnHover, setCanToggleOnHover] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Individual radio's gain changes
  const updateRadioGainValue = (newRelativeGain: number, isManualMode = true, store = true) => {
    // Update the relative gain in state
    setIndividualRadioGain(radio.frequency, newRelativeGain, isManualMode);

    // Calculate and update actual output gain
    const absoluteGain = (newRelativeGain * radioGain) / 10000;
    void window.api.SetFrequencyRadioGain(radio.frequency, absoluteGain);

    if (store) {
      window.localStorage.setItem(radio.callsign + 'RadioGain', newRelativeGain.toString());
    }
  };

  useEffect(() => {
    if (radio.radioGain) {
      const absoluteGain = (radio.radioGain * radioGain) / 10000;
      void window.api.SetFrequencyRadioGain(radio.frequency, absoluteGain);
    }
  }, [radioGain]); // Only depend on master gain changes

  const setStoredGain = () => {
    const storedGain = window.localStorage.getItem(radio.callsign + 'RadioGain');
    if (storedGain) {
      const gainValue = parseInt(storedGain);
      if (isNaN(gainValue)) {
        resetToMainGain();
      } else {
        updateRadioGainValue(gainValue, true, false);
      }
    } else {
      resetToMainGain();
    }
  };

  useEffect(() => {
    setStoredGain();
  }, []);

  useEffect(() => {
    if (radio.tx && radio.radioGain && radioGain > radio.radioGain) {
      resetToMainGain();
    }
  }, [radio.tx]);

  useEffect(() => {
    const storedGain = window.localStorage.getItem(radio.callsign + 'RadioGain');
    const gainToSet = storedGain?.length ? parseInt(storedGain) : radioGain;
    if (storedGain) {
      updateRadioGainValue(gainToSet, false);
    }
  }, []);

  const resetToMainGain = () => {
    resetIndividualRadioGain(radio.frequency);
    updateRadioGainValue(100, false);
    window.localStorage.removeItem(radio.callsign + 'RadioGain');
  };

  const handleRadioGainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateRadioGainValue(event.target.valueAsNumber);
  };

  const handleRadioGainMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(Math.max(radio.radioGain + (event.deltaY > 0 ? -1 : 1), 0), 100);
    updateRadioGainValue(newValue);
  };

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

  const handleMouseEnterFrequency = () => {
    if (radio.humanFrequencyAlias) {
      setIsHoveringFrequency(true);
    }
  };

  const handleMouseLeaveFrequency = () => {
    setCanToggleOnHover(true);
    setIsHoveringFrequency(false);
  };

  const clickRadioHeader = () => {
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
  };

  const { displayValue } = getDisplayFrequencyInfo();

  const getFrequencyTypeDisplay = () => {
    if (!radio.humanFrequencyAlias) return null;

    if (isHoveringFrequency && canToggleOnHover) {
      return showAliasFrequency ? 'HF' : 'VHF';
    }

    return showAliasFrequency ? 'VHF' : 'HF';
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
        (radio.radioGain * radioGain) / 10000
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
          onSpeaker: radio.onSpeaker
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
        !newState ? false : radio.crossCoupleAcross, // If tx is false, crossCoupleAcross must be false,
        (radio.radioGain * radioGain) / 10000
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
          onSpeaker: radio.onSpeaker
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
        false, // If xc is true, crossCoupleAcross must be false
        (radio.radioGain * radioGain) / 10000
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
          onSpeaker: radio.onSpeaker
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
        (radio.radioGain * radioGain) / 10000
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
          onSpeaker: radio.onSpeaker
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
        (radio.radioGain * radioGain) / 10000
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
          onSpeaker: newState
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
          <Sliders2 />
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
        <div className="d-flex flex-row align-items-center px-3 gap-2">
          <div
          // className={clsx({
          //   'text-white': radio.manualGain,
          //   'text-muted': !radio.manualGain
          // })}
          >
            VOLUME
          </div>

          <input
            type="range"
            className="form-range radio-text radio-volume-bar"
            style={{
              lineHeight: '30px',
              width: '100px'
            }}
            min="0"
            max="100"
            step="1"
            value={radio.radioGain}
            onChange={handleRadioGainChange}
            onWheel={handleRadioGainMouseWheel}
          />
          <button
            type="button"
            className="radio-reset-gain"
            onClick={resetToMainGain}
            title="Reset Volume"
            disabled={!radio.manualGain}
          >
            <XCircle size={13} />
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
              !radio.rx && 'btn-primary',
              radio.rx && radio.currentlyRx && 'btn-warning',
              radio.rx && !radio.currentlyRx && 'btn-success'
            )}
            onClick={clickRx}
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

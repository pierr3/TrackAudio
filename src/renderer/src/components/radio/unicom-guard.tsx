import useRadioState, { RadioType } from '@renderer/store/radioStore';
import '../../style/UnicomGuard.scss';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import useSessionStore from '@renderer/store/sessionStore';
import useErrorStore from '@renderer/store/errorStore';
import { GuardFrequency, UnicomFrequency } from '../../../../shared/common';

const UnicomGuardBar = () => {
  const [radios, setRadioState] = useRadioState((state) => [state.radios, state.setRadioState]);
  const [isNetworkConnected, isAtc] = useSessionStore((state) => [state.isNetworkConnected, state.isAtc]);

  const [localRadioGain, setLocalRadioGain] = useState(50);

  const postError = useErrorStore((state) => state.postError);

  const unicom = useMemo(() => {
    return radios.find((radio) => radio.frequency === UnicomFrequency);
  }, [radios]);

  const guard = useMemo(() => {
    return radios.find((radio) => radio.frequency === GuardFrequency);
  }, [radios]);

  const clickRx = (radio: RadioType | undefined) => {
    if (!radio) return;
    const newState = !radio.rx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState,
        newState ? radio.tx : false,
        false,
        radio.onSpeaker,
        false
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: RX.');
          return;
        }
        setRadioState(radio.frequency, {
          rx: newState,
          tx: !newState ? false : radio.tx,
          xc: !false,
          crossCoupleAcross: false,
          onSpeaker: radio.onSpeaker
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const clickTx = (radio: RadioType | undefined) => {
    if (!radio) return;
    const newState = !radio.tx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If tx is true, rx must be true
        newState,
        false,
        radio.onSpeaker,
        false
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: TX.');
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: newState,
          xc: false,
          crossCoupleAcross: false,
          onSpeaker: radio.onSpeaker
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const clickSpK = (radio: RadioType | undefined) => {
    if (!radio) return;
    const newState = !radio.onSpeaker;
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        radio.xc,
        newState,
        radio.crossCoupleAcross
      )
      .then((ret) => {
        if (!ret) {
          postError('Invalid action on invalid radio: OnSPK.');
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

  useEffect(() => {
    const storedGain = window.localStorage.getItem('unicomRadioGain');
    const gainToSet = storedGain?.length ? parseInt(storedGain) : 50;
    setLocalRadioGain(storedGain?.length ? parseInt(storedGain) : 50);
    console.log('Setting unicom radio gain to', gainToSet);
    void window.api.SetFrequencyRadioGain(UnicomFrequency, gainToSet / 100);
    void window.api.SetFrequencyRadioGain(GuardFrequency, gainToSet / 100);
  }, []);

  const updateRadioGainValue = (newGain: number) => {
    if (!unicom || !guard) return;
    window.api
      .SetFrequencyRadioGain(unicom.frequency, newGain / 100)
      .then(() => {
        void window.api.SetFrequencyRadioGain(guard.frequency, newGain / 100);
        setLocalRadioGain(newGain);
        console.log('Setting unicom radio gain to', newGain);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    window.localStorage.setItem('unicomRadioGain', newGain.toString());
  };

  const handleRadioGainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateRadioGainValue(event.target.valueAsNumber);
  };

  const handleRadioGainMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(Math.max(localRadioGain + (event.deltaY > 0 ? -1 : 1), 0), 100);

    updateRadioGainValue(newValue);
  };

  return (
    <div className="unicom-bar-container">
      <span className="unicom-line-item">
        <span className="unicom-text" style={{ marginRight: '5px' }}>
          UNICOM
        </span>
        <button
          className={clsx(
            'btn sm-button',
            !unicom?.rx && 'btn-info',
            unicom?.rx && unicom.currentlyRx && 'btn-warning',
            unicom?.rx && !unicom.currentlyRx && 'btn-success'
          )}
          disabled={!isNetworkConnected || !unicom}
          onClick={() => {
            clickRx(unicom);
          }}
        >
          RX
        </button>
        <button
          className={clsx(
            'btn sm-button',
            !unicom?.tx && 'btn-info',
            unicom?.tx && unicom.currentlyTx && 'btn-warning',
            unicom?.tx && !unicom.currentlyTx && 'btn-success'
          )}
          disabled={!isNetworkConnected || !unicom || !isAtc}
          onClick={() => {
            clickTx(unicom);
          }}
        >
          TX
        </button>
        <span className="hide-unicom-container">
          <button
            className={clsx(
              'btn sm-button',
              !unicom?.onSpeaker && 'btn-info',
              unicom?.onSpeaker && 'btn-success'
            )}
            disabled={!isNetworkConnected || !unicom}
            onClick={() => {
              clickSpK(unicom);
            }}
          >
            SPK
          </button>
        </span>
      </span>

      <span className="unicom-line-item">
        <span className="unicom-text" style={{ marginRight: '5px' }}>
          GUARD
        </span>
        <button
          className={clsx(
            'btn sm-button',
            !guard?.rx && 'btn-info',
            guard?.rx && guard.currentlyRx && 'btn-warning',
            guard?.rx && !guard.currentlyRx && 'btn-success'
          )}
          disabled={!isNetworkConnected || !guard}
          onClick={() => {
            clickRx(guard);
          }}
        >
          RX
        </button>
        <button
          className={clsx(
            'btn sm-button',
            !guard?.tx && 'btn-info',
            guard?.tx && guard.currentlyTx && 'btn-warning',
            guard?.tx && !guard.currentlyTx && 'btn-success'
          )}
          disabled={!isNetworkConnected || !guard || !isAtc}
          onClick={() => {
            clickTx(guard);
          }}
        >
          TX
        </button>
        <span className="hide-unicom-container">
          <button
            className={clsx(
              'btn sm-button',
              !guard?.onSpeaker && 'btn-info',
              guard?.onSpeaker && 'btn-success'
            )}
            disabled={!isNetworkConnected || !guard}
            onClick={() => {
              clickSpK(guard);
            }}
          >
            SPK
          </button>
        </span>
      </span>
      <span className="hide-unicom-container">
        <input
          type="range"
          className="form-range unicom-text unicom-volume-bar "
          min="0"
          max="100"
          step="1"
          value={localRadioGain}
          onChange={handleRadioGainChange}
          onWheel={handleRadioGainMouseWheel}
        ></input>
      </span>
    </div>
  );
};

export default UnicomGuardBar;

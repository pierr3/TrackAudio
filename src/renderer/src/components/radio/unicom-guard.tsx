import useRadioState, { RadioType } from '@renderer/store/radioStore';
import '../../style/UnicomGuard.scss';
import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import useSessionStore from '@renderer/store/sessionStore';
import useErrorStore from '@renderer/store/errorStore';
import { GuardFrequency, UnicomFrequency } from '../../../../shared/common';
import { useMediaQuery } from 'react-responsive';

const UnicomGuardBar = () => {
  const [radios, setRadioState, addRadio, removeRadio, setOutputVolume] = useRadioState((state) => [
    state.radios,
    state.setRadioState,
    state.addRadio,
    state.removeRadio,
    state.setOutputVolume
  ]);
  const [isConnected, isAtc] = useSessionStore((state) => [state.isConnected, state.isAtc]);

  const isReducedSize = useMediaQuery({ maxWidth: '895px' });

  // const [localUnicomStationVolume, setLocalUnicomStationVolume] = useState(50);

  const [showingUnicomBar] = useRadioState((state) => [state.showingUnicomBar]);

  const postError = useErrorStore((state) => state.postError);

  const unicom = useMemo(() => {
    return radios.find((radio) => radio.frequency === UnicomFrequency);
  }, [radios, isConnected]);

  const guard = useMemo(() => {
    return radios.find((radio) => radio.frequency === GuardFrequency);
  }, [radios, isConnected]);

  const reAddRadio = (radio: RadioType, eventType: 'RX' | 'TX' | 'SPK') => {
    const radioName =
      radio.frequency === UnicomFrequency
        ? 'UNICOM'
        : radio.frequency === GuardFrequency
          ? 'GUARD'
          : 'INVALIDUNIGUARD';

    window.api
      .addFrequency(radio.frequency, radioName)
      .then((ret) => {
        if (!ret) {
          postError(`Failed to re-add ${radioName} frequency`);
          return;
        }
        if (eventType === 'RX') {
          clickRx(radio, true);
        }
        if (eventType === 'TX') {
          clickTx(radio, true);
        }
        if (eventType === 'SPK') {
          clickSpK(radio, true);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const clickRx = (radio: RadioType | undefined, noError = false) => {
    if (!radio) return;
    const newState = !radio.rx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState,
        newState ? radio.tx : false,
        false,
        radio.onSpeaker,
        false,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret && !noError) {
          reAddRadio(radio, 'RX');
          return;
        }
        setRadioState(radio.frequency, {
          rx: newState,
          tx: !newState ? false : radio.tx,
          xc: !false,
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

  const clickTx = (radio: RadioType | undefined, noError = false) => {
    if (!radio) return;
    const newState = !radio.tx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If tx is true, rx must be true
        newState,
        false,
        radio.onSpeaker,
        false,
        radio.isOutputMuted,
        radio.outputVolume
      )
      .then((ret) => {
        if (!ret && !noError) {
          reAddRadio(radio, 'TX');
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: newState,
          xc: false,
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

  const clickSpK = (radio: RadioType | undefined, noError = false) => {
    if (!radio) return;
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
        if (!ret && !noError) {
          reAddRadio(radio, 'SPK');
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

  const toggleMute = (radio: RadioType | undefined) => {
    if (!radio) return;

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

  // In UnicomGuardBar.tsx, modify the useEffect:
  useEffect(() => {
    if (!isConnected) {
      void window.api.removeFrequency(UnicomFrequency).then((ret) => {
        if (!ret) return;
        removeRadio(UnicomFrequency);
      });
      void window.api.removeFrequency(GuardFrequency).then((ret) => {
        if (!ret) return;
        removeRadio(GuardFrequency);
      });
    } else if (!unicom || !guard) {
      // Setup UNICOM
      void window.api.addFrequency(UnicomFrequency, 'UNICOM').then(async (ret) => {
        if (!ret) {
          console.error('Failed to add UNICOM frequency');
          return;
        }

        // Get stored volume before adding radio
        const storedStationVolume = window.localStorage.getItem('UNICOMStationVolume');
        const stationVolumeToSet = storedStationVolume?.length
          ? parseInt(storedStationVolume)
          : 100;

        // Create radio object with initial volume
        addRadio(UnicomFrequency, 'UNICOM', 'UNICOM');

        // Set volume in store immediately after adding radio
        setOutputVolume(UnicomFrequency, stationVolumeToSet);

        // Set volume in API
        await window.api.SetFrequencyRadioVolume(UnicomFrequency, stationVolumeToSet);
      });

      // Setup GUARD with same volume as UNICOM
      void window.api.addFrequency(GuardFrequency, 'GUARD').then(async (ret) => {
        if (!ret) {
          console.error('Failed to add GUARD frequency');
          return;
        }

        // Get the same stored volume as UNICOM
        const storedStationVolume = window.localStorage.getItem('UNICOMStationVolume');
        const stationVolumeToSet = storedStationVolume?.length
          ? parseInt(storedStationVolume)
          : 100;

        addRadio(GuardFrequency, 'GUARD', 'GUARD');
        setOutputVolume(GuardFrequency, stationVolumeToSet);
        await window.api.SetFrequencyRadioVolume(GuardFrequency, stationVolumeToSet);
      });
    }
  }, [isConnected]);

  // Also modify updateStationVolumeValue to set store value first:
  const updateStationVolumeValue = async (newStationVolume: number) => {
    if (!unicom || !guard) return;

    // Update store values first
    setOutputVolume(unicom.frequency, newStationVolume);
    setOutputVolume(guard.frequency, newStationVolume);

    // Then update API
    try {
      await window.api.SetFrequencyRadioVolume(unicom.frequency, newStationVolume);
      await window.api.SetFrequencyRadioVolume(guard.frequency, newStationVolume);
      window.localStorage.setItem('UNICOMStationVolume', newStationVolume.toString());
    } catch (err) {
      console.error(err);
    }
  };
  const handleStationVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void updateStationVolumeValue(event.target.valueAsNumber);
  };

  const handleStationVolumeMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(
      Math.max(unicom?.outputVolume ?? 100 + (event.deltaY > 0 ? -1 : 1), 0),
      100
    );

    void updateStationVolumeValue(newValue);
  };

  if (!showingUnicomBar) {
    return null;
  }

  return (
    <div className="unicom-bar-container">
      <span className="unicom-line-item">
        <span className="unicom-text " style={{ marginRight: '5px' }}>
          UNICOM
        </span>
        <button
          className={clsx(
            'btn sm-button',
            unicom?.isOutputMuted && 'btn-danger',
            !unicom?.rx && !unicom?.isOutputMuted && 'btn-info',
            unicom?.rx && !unicom.isOutputMuted && unicom.currentlyRx && 'btn-warning',
            unicom?.rx && !unicom.isOutputMuted && !unicom.currentlyRx && 'btn-success'
          )}
          disabled={!isConnected || !unicom}
          onClick={() => {
            clickRx(unicom);
          }}
          onContextMenu={() => {
            toggleMute(unicom);
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
          disabled={!isConnected || !unicom || !isAtc}
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
            disabled={!isConnected || !unicom}
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
            guard?.isOutputMuted && 'btn-danger',
            !guard?.rx && !guard?.isOutputMuted && 'btn-info',
            guard?.rx && !guard.isOutputMuted && guard.currentlyRx && 'btn-warning',
            guard?.rx && !guard.isOutputMuted && !guard.currentlyRx && 'btn-success'
          )}
          disabled={!isConnected || !guard}
          onClick={() => {
            clickRx(guard);
          }}
          onContextMenu={() => {
            toggleMute(guard);
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
          disabled={!isConnected || !guard || !isAtc}
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
            disabled={!isConnected || !guard}
            onClick={() => {
              clickSpK(guard);
            }}
          >
            SPK
          </button>
        </span>
      </span>
      <span
        className="hide-unicom-container"
        style={{
          lineHeight: '30px'
        }}
      >
        {!isReducedSize && (
          <span className="unicom-text " style={{ marginRight: '10px', lineHeight: '29px' }}>
            VOLUME
          </span>
        )}
        <input
          type="range"
          className="form-range unicom-text unicom-volume-bar "
          style={{
            lineHeight: '30px'
          }}
          min="0"
          max="100"
          step="1"
          value={unicom?.outputVolume ?? 100}
          onChange={handleStationVolumeChange}
          onWheel={handleStationVolumeMouseWheel}
        ></input>
      </span>
    </div>
  );
};

export default UnicomGuardBar;

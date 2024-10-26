import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { checkIfCallsignIsRelief, getCleanCallsign } from '../helpers/CallsignHelper';
import useErrorStore from '../store/errorStore';
import useSessionStore from '../store/sessionStore';
import '../style/navbar.scss';
import Clock from './clock';
import MiniModeToggleButton from './MiniModeToggleButton';
import SettingsModal from './settings-modal/settings-modal';
import TitleBar from './titlebar/TitleBar';
import { GearFill, PlusCircleFill } from 'react-bootstrap-icons';
import SessionStatus from './titlebar/session-status/SessionStatus';
import { Configuration } from 'src/shared/config.type';
import useUtilStore from '@renderer/store/utilStore';
import AddStationModal from './add-station-model/station-modal';
import RxInfo from './rxinfo';

const Navbar: React.FC = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [platform] = useUtilStore((state) => [state.platform]);
  const [callsign, isConnected, isConnecting, radioGain, setRadioGain] = useSessionStore(
    (state) => [
      state.callsign,
      state.isConnected,
      state.isConnecting,
      state.radioGain,
      state.setRadioGain
    ]
  );

  // Handles letting the main process know settings can be triggered
  // remotely, and responds to requests to open the settings dialog.
  useEffect(() => {
    window.api.settingsReady().catch((err: unknown) => {
      console.error(err);
    });

    window.electron.ipcRenderer.on('show-settings', () => {
      if (showAddStationModal) return;
      setShowSettingsModal(true);
    });
  }, []);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        const gain = config.radioGain || 0.5;
        const UiGain = gain * 100 || 50;

        window.api
          .SetRadioGain(gain)
          .then(() => {
            setRadioGain(UiGain);
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [setRadioGain]);

  const updateRadioGainValue = (newGain: number) => {
    window.api
      .SetRadioGain(newGain / 100)
      .then(() => {
        setRadioGain(newGain);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const handleRadioGainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateRadioGainValue(event.target.valueAsNumber);
  };

  const handleRadioGainMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(Math.max(radioGain + (event.deltaY > 0 ? -1 : 1), 0), 100);

    updateRadioGainValue(newValue);
  };

  return (
    <>
      <TitleBar className="d-flex flex-md-row align-items-center  mb-3 custom-navbar hide-topbar">
        <TitleBar.Section name="left" priority={1}>
          <TitleBar.Element priority={0}>
            <Clock />
          </TitleBar.Element>
          <TitleBar.Element priority={1}>
            <div className="d-flex h-100 align-items-center">
              <button
                className="btn btn-primary hide-settings-flex"
                disabled={isConnected || isConnecting}
                onClick={() => {
                  if (showAddStationModal) return;
                  setShowSettingsModal(true);
                }}
              >
                <GearFill />
              </button>
            </div>
          </TitleBar.Element>
          <TitleBar.Element priority={2}>
            <div className="d-flex h-100 align-items-center">
              <MiniModeToggleButton showRestoreButton={false} />
              {platform === 'linux' && (
                <button
                  className="btn btn-danger m-1 hide-gain-value"
                  onClick={() => void window.api.CloseMe()}
                >
                  X
                </button>
              )}
            </div>
          </TitleBar.Element>
          {/* <TitleBar.Element priority={3}>
            <div className="d-flex h-100 align-items-center">
              <input
                type="range"
                className="form-range m-1 gain-slider w-75"
                min="0"
                max="100"
                step="1"
                onChange={handleRadioGainChange}
                onWheel={handleRadioGainMouseWheel}
                value={radioGain}
              ></input>
            </div>
          </TitleBar.Element> */}
        </TitleBar.Section>
        <TitleBar.Section name="center" priority={2}>
          <TitleBar.Element priority={0}>
            <span className={clsx('d-flex h-100 align-items-center draggable package-text')}>
              {isConnected && callsign ? `Connected as ${callsign}` : 'Track Audio'}
            </span>
          </TitleBar.Element>
        </TitleBar.Section>
        <TitleBar.Section name="right" priority={0}>
          {/* <TitleBar.Element priority={0}>
            <div className="d-flex h-100 align-items-center">
              <span
                className={clsx(
                  'btn text-box-container m-1 ',
                  isNetworkConnected && !isAtc && 'color-warning'
                )}
              >
                {isNetworkConnected ? callsign : 'Not Connected'}
              </span>
            </div>
          </TitleBar.Element> */}
          <TitleBar.Element priority={3}>
            <RxInfo />
          </TitleBar.Element>
          <TitleBar.Element priority={2}>
            <div className="d-flex h-100 align-items-center">
              <button
                className="btn btn-primary hide-settings-flex"
                disabled={!isConnected}
                onClick={() => {
                  if (showSettingsModal || !isConnected) return;
                  setShowAddStationModal(true);
                }}
              >
                <PlusCircleFill />
              </button>
            </div>
          </TitleBar.Element>
          <TitleBar.Element priority={1}>
            <SessionStatus />
          </TitleBar.Element>

          {/* <TitleBar.Element priority={3}>
            <div className="d-flex h-100 align-items-center">
              <span
                className="btn text-box-container m-1 "
                style={{ width: '100px' }}
                onWheel={handleRadioGainMouseWheel}
              >
                Gain: {radioGain.toFixed(0).padStart(3, '0')}%
              </span>
              <input
                type="range"
                className="form-range m-1 gain-slider w-50"
                min="0"
                max="100"
                step="1"
                onChange={handleRadioGainChange}
                onWheel={handleRadioGainMouseWheel}
                value={radioGain}
              ></input>
            </div>
          </TitleBar.Element>
          <TitleBar.Element priority={4}>
            <div className="d-flex h-100 align-items-center">
              <MiniModeToggleButton showRestoreButton={false} />
              {platform === 'linux' && (
                <button
                  className="btn btn-danger m-1 hide-gain-value"
                  onClick={() => void window.api.CloseMe()}
                >
                  X
                </button>
              )}
            </div>
          </TitleBar.Element> */}
        </TitleBar.Section>
      </TitleBar>

      {/* <div className="d-flex flex-md-row align-items-center p-3 px-md-4 mb-3 custom-navbar hide-topbar">
        <Clock />
        <span
          className={clsx(
            'btn text-box-container m-1',
            isNetworkConnected && !isAtc && 'color-warning'
          )}
        >
          {isNetworkConnected ? callsign : 'Not Connected'}
        </span>
        <button
          className={clsx(
            'btn m-1 hide-connect-flex',
            !isConnected && 'btn-info',
            isConnecting && 'loading-button',
            isConnected && 'btn-danger'
          )}
          onClick={() => {
            handleConnectDisconnect();
          }}
          disabled={isConnecting || !isNetworkConnected}
        >
          {isConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'}
        </button>
        <button
          className="btn btn-info m-1 hide-settings-flex"
          disabled={isConnected || isConnecting}
          onClick={() => {
            setShowModal(true);
          }}
        >
          Settings
        </button>

        <span
          className="btn text-box-container m-1 hide-gain-value"
          style={{ width: '88px' }}
          onWheel={handleRadioGainMouseWheel}
        >
          Gain: {radioGain.toFixed(0).padStart(3, '0')}%
        </span>
        <input
          type="range"
          className="form-range m-1 gain-slider"
          min="0"
          max="100"
          step="1"
          onChange={handleRadioGainChange}
          onWheel={handleRadioGainMouseWheel}
          value={radioGain}
        ></input>
        <MiniModeToggleButton showRestoreButton={false} />
        {platform === 'linux' && (
          <button
            className="btn btn-danger m-1 hide-gain-value"
            onClick={() => void window.api.CloseMe()}
          >
            X
          </button>
        )}
      </div> */}
      {showSettingsModal && (
        <SettingsModal
          closeModal={() => {
            setShowSettingsModal(false);
          }}
        />
      )}

      {showAddStationModal && (
        <AddStationModal
          closeModal={() => {
            setShowAddStationModal(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;

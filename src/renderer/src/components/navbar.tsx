import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import useSessionStore from '../store/sessionStore';
import '../style/navbar.scss';
import Clock from './clock';
import MiniModeToggleButton from './MiniModeToggleButton';
import SettingsModal from './settings-modal/settings-modal';
import TitleBar from './titlebar/TitleBar';
import SessionStatus from './titlebar/session-status/SessionStatus';
import useUtilStore from '@renderer/store/utilStore';
import AddStationModal from './add-station-model/station-modal';
import DeleteMultipleRadios from './delete-multiple-radios';
import useRadioState from '@renderer/store/radioStore';
import RefreshMultipleRadios from './refresh-multiple-radios';
import { CirclePlus, Settings, SquarePen } from 'lucide-react';

const Navbar: React.FC = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [platform, isEditMode, setIsEditMode] = useUtilStore((state) => [
    state.platform,
    state.isEditMode,
    state.setIsEditMode
  ]);
  const [callsign, isConnected, isConnecting] = useSessionStore((state) => [
    state.callsign,
    state.isConnected,
    state.isConnecting
  ]);

  const [clearRadiosToBeDeleted] = useRadioState((state) => [state.clearRadiosToBeDeleted]);

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

  return (
    <>
      <TitleBar className="d-flex flex-md-row align-items-center custom-navbar hide-topbar">
        <TitleBar.Section name="left" priority={1}>
          <TitleBar.Element priority={4}>
            <Clock />
          </TitleBar.Element>
          <TitleBar.Element priority={1}>
            <div className="d-flex h-100 align-items-center">
              <button
                className={clsx(
                  'btn hide-settings-flex',
                  isEditMode ? 'btn-warning' : 'btn-primary'
                )}
                disabled={!isConnected}
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  clearRadiosToBeDeleted();
                }}
              >
                <SquarePen size={15} />
              </button>
            </div>
          </TitleBar.Element>
          {isEditMode && (
            <TitleBar.Element priority={2}>
              <DeleteMultipleRadios />
            </TitleBar.Element>
          )}
          {isEditMode && (
            <TitleBar.Element priority={3}>
              <RefreshMultipleRadios />
            </TitleBar.Element>
          )}
          {!isEditMode && (
            <TitleBar.Element priority={2}>
              <div className="d-flex h-100 align-items-center">
                <button
                  className="btn btn-primary hide-settings-flex "
                  disabled={!isConnected}
                  onClick={() => {
                    if (showSettingsModal || !isConnected) return;
                    setShowAddStationModal(true);
                  }}
                >
                  <CirclePlus size={15} />
                </button>
              </div>
            </TitleBar.Element>
          )}
          {!isEditMode && (
            <TitleBar.Element priority={3}>
              <div className="d-flex h-100 align-items-center">
                <button
                  className="btn btn-primary hide-settings-flex "
                  disabled={isConnected || isConnecting}
                  onClick={() => {
                    if (showAddStationModal) return;
                    setShowSettingsModal(true);
                  }}
                >
                  <Settings size={15} />
                </button>
              </div>
            </TitleBar.Element>
          )}
        </TitleBar.Section>
        <TitleBar.Section name="center" priority={2}>
          <TitleBar.Element priority={0}>
            <span className={clsx('d-flex h-100 align-items-center draggable package-text')}>
              {isConnected && callsign
                ? `Connected as ${callsign}`
                : callsign
                  ? callsign
                  : 'Track Audio'}
            </span>
          </TitleBar.Element>
        </TitleBar.Section>
        <TitleBar.Section name="right" priority={0}>
          {/* {isNetworkConnected && ( */}
          <TitleBar.Element priority={2}>
            <div className="d-flex h-100 align-items-center">
              <MiniModeToggleButton showRestoreButton={false} />
              {platform === 'linux' && (
                <button
                  className="btn btn-danger m-1 hide-volume-value"
                  onClick={() => void window.api.CloseMe()}
                >
                  X
                </button>
              )}
            </div>
          </TitleBar.Element>
          {/* )} */}
          {/* {isNetworkConnected && ( */}
          <TitleBar.Element priority={1}>
            <SessionStatus />
          </TitleBar.Element>
          {/* )} */}
        </TitleBar.Section>
      </TitleBar>

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

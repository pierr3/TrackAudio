import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { AudioApi, AudioDevice } from 'trackaudio-afv';
import { useDebouncedCallback } from 'use-debounce';

import {
  AlwaysOnTopMode,
  Configuration,
  RadioEffects,
  Theme
} from '../../../../shared/config.type';
import useRadioState from '../../store/radioStore';
import useUtilStore from '../../store/utilStore';
import AudioApis from './audio-apis';
import AudioInput from './audio-input';
import AudioOutputs from './audio-outputs';
import { Info } from 'lucide-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
export interface SettingsModalProps {
  closeModal: () => void;
}

export enum SaveStatus {
  NoChanges,
  Saving,
  Saved
}

const SettingsModal: React.FC<SettingsModalProps> = ({ closeModal }) => {
  const [changesSaved, setChangesSaved] = useState(SaveStatus.NoChanges);
  const [audioApis, setAudioApis] = useState(Array<AudioApi>);
  const [audioOutputDevices, setAudioOutputDevices] = useState(Array<AudioDevice>);
  const [audioInputDevices, setAudioInputDevices] = useState(Array<AudioDevice>);
  const [radioEffects, setRadioEffects] = useState<RadioEffects>('on');
  const [hardwareType, setHardwareType] = useState(0);
  const [config, setConfig] = useState({} as Configuration);
  const [alwaysOnTop, setAlwaysOnTop] = useState<AlwaysOnTopMode>('never');
  const [transparentMiniMode, setLocalTransparentMiniMode] = useState(false);
  const [cid, setCid] = useState('');
  const [password, setPassword] = useState('');

  const [pttIsOn] = useRadioState((state) => [state.pttIsOn]);

  const [platform] = useUtilStore((state) => [state.platform]);

  const isWindows = platform === 'win32';

  const [
    vu,
    vuPeak,
    updateVu,
    ptt1KeyName,
    ptt2KeyName,
    hasPtt1BeenSetDuringSetup,
    hasPtt2BeenSetDuringSetup,
    updatePtt1KeySet,
    updatePtt2KeySet,
    showExpandedRxInfo,
    radioToMaxVolumeOnTX,
    updateChannel,
    theme,
    setShowExpandedRxInfo,
    setTransparentMiniMode,
    setPendingRestart,
    setRadioToMaxVolumeOnTX,
    setUpdateChannel,
    setTheme
  ] = useUtilStore((state) => [
    state.vu,
    state.peakVu,
    state.updateVu,
    state.ptt1KeyName,
    state.ptt2KeyName,
    state.hasPtt1BeenSetDuringSetup,
    state.hasPtt2BeenSetDuringSetup,
    state.updatePtt1KeySet,
    state.updatePtt2KeySet,
    state.showExpandedRxInfo,
    state.radioToMaxVolumeOnTX,
    state.updateChannel,
    state.theme,
    state.setShowExpandedRxInfo,
    state.setTransparentMiniMode,
    state.setPendingRestart,
    state.setRadioToMaxVolumeOnTX,
    state.setUpdateChannel,
    state.setTheme
  ]);
  const [isMicTesting, setIsMicTesting] = useState(false);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        setConfig(config);
        setCid(config.cid);
        setPassword(config.password);
        setRadioEffects(config.radioEffects);
        setHardwareType(config.hardwareType);
        setAlwaysOnTop(config.alwaysOnTop as AlwaysOnTopMode);
        setShowExpandedRxInfo(config.showExpandedRx);
        setTransparentMiniMode(config.transparentMiniMode);
        setLocalTransparentMiniMode(config.transparentMiniMode);
        setRadioToMaxVolumeOnTX(config.radioToMaxVolumeOnTx);
        setUpdateChannel(config.updateChannel);
        setTheme(config.theme);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (!config.audioApi && config.audioApi !== 0) {
      return;
    }
    window.api
      .getAudioApis()
      .then((apis: AudioApi[]) => {
        setAudioApis(apis);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    window.api
      .getAudioOutputDevices(config.audioApi)
      .then((devices: AudioDevice[]) => {
        setAudioOutputDevices(devices);
      })
      .catch((err: unknown) => {
        console.error(err);
      });

    window.api
      .getAudioInputDevices(config.audioApi)
      .then((devices: AudioDevice[]) => {
        setAudioInputDevices(devices);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [config.audioApi]);

  const debouncedCid = useDebouncedCallback((cid: string) => {
    setChangesSaved(SaveStatus.Saving);
    setConfig({ ...config, cid: cid });
    void window.api.setCid(cid);
    setChangesSaved(SaveStatus.Saved);
  }, 500);

  const debouncedPassword = useDebouncedCallback((password: string) => {
    setChangesSaved(SaveStatus.Saving);
    setPassword(password);
    setConfig({ ...config, password: password });
    void window.api.setPassword(password);
    setChangesSaved(SaveStatus.Saved);
  }, 1000);

  const changeAudioApi = (api: number) => {
    setChangesSaved(SaveStatus.Saving);
    void window.api.setAudioApi(api);
    setConfig({ ...config, audioApi: api });
    window.api
      .getAudioOutputDevices(api)
      .then((devices: AudioDevice[]) => {
        setAudioOutputDevices(devices);
      })
      .catch(() => {
        setAudioOutputDevices([]);
      });
    window.api
      .getAudioInputDevices(api)
      .then((devices: AudioDevice[]) => {
        setAudioInputDevices(devices);
      })
      .catch(() => {
        setAudioInputDevices([]);
      });
    setChangesSaved(SaveStatus.Saved);
  };

  const setInputDevice = (deviceId: string) => {
    setChangesSaved(SaveStatus.Saving);
    void window.api.setAudioInputDevice(deviceId);
    setConfig({ ...config, audioInputDeviceId: deviceId });
    setChangesSaved(SaveStatus.Saved);
  };

  const setHeadsetDevice = (deviceId: string) => {
    setChangesSaved(SaveStatus.Saving);
    void window.api.setHeadsetOutputDevice(deviceId);
    setConfig({ ...config, headsetOutputDeviceId: deviceId });
    setChangesSaved(SaveStatus.Saved);
  };

  const setSpeakerDevice = (deviceId: string) => {
    setChangesSaved(SaveStatus.Saving);
    void window.api.setSpeakerOutputDevice(deviceId);
    setConfig({ ...config, speakerOutputDeviceId: deviceId });
    setChangesSaved(SaveStatus.Saved);
  };

  const handleAlwaysOnTop = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setAlwaysOnTop(e.target.value as AlwaysOnTopMode);
    setAlwaysOnTop(e.target.value as AlwaysOnTopMode);
    setChangesSaved(SaveStatus.Saved);
  };

  const handleShowExpandedRxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    if (e.target.value === 'true') {
      setShowExpandedRxInfo(true);
      window.api.setShowExpandedRx(true);
    } else {
      setShowExpandedRxInfo(false);
      window.api.setShowExpandedRx(false);
    }
    setChangesSaved(SaveStatus.Saved);
  };

  const handleTransparentMiniMode = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    if (e.target.value === 'true') {
      window.api.setTransparentMiniMode(true);
      setLocalTransparentMiniMode(true);
    } else {
      window.api.setTransparentMiniMode(false);
      setLocalTransparentMiniMode(false);
    }
    setPendingRestart(true);
    setChangesSaved(SaveStatus.Saved);
  };

  const handleSetRadioToMaxVolumeOnTX = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    if (e.target.value === 'true') {
      window.api.setRadioToMaxVolumeOnTX(true);
      setRadioToMaxVolumeOnTX(true);
    } else {
      window.api.setRadioToMaxVolumeOnTX(false);
      setRadioToMaxVolumeOnTX(false);
    }
    setChangesSaved(SaveStatus.Saved);
  };

  const handleSetTheme = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value !== 'default' && e.target.value !== 'schmid-ics') {
      return;
    }
    setChangesSaved(SaveStatus.Saving);

    const newTheme = e.target.value as Theme;
    window.api.setTheme(newTheme);
    setTheme(newTheme);
    setChangesSaved(SaveStatus.Saved);
  };

  const handleSetPtt = (pttIndex: number, shouldListenForJoysticks: boolean) => {
    if (pttIndex === 1) {
      updatePtt1KeySet(false);
    } else if (pttIndex === 2) {
      updatePtt2KeySet(false);
    }

    setChangesSaved(SaveStatus.Saved);
    void window.api.SetupPtt(pttIndex, shouldListenForJoysticks);
  };

  const handleUpdateChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if ((e.target.value !== 'stable' && e.target.value !== 'beta') || !isWindows) {
      return;
    }
    void window.api.SetUpdateChannel(e.target.value);
    setPendingRestart(true);
    setUpdateChannel(e.target.value);
    setChangesSaved(SaveStatus.Saved);
  };

  const handleClearPtt = (pttIndex: number) => {
    if (pttIndex === 1 && ptt2KeyName !== 'Not Set') {
      return;
    }

    if (pttIndex === 1) {
      updatePtt1KeySet(false);
    } else if (pttIndex === 2) {
      updatePtt2KeySet(false);
    }

    setChangesSaved(SaveStatus.Saved);
    void window.api.ClearPtt(pttIndex);
  };

  const handleMicTest = () => {
    if (isMicTesting) {
      void window.api.StopMicTest();
      setIsMicTesting(false);
      updateVu(0, 0);
      return;
    }
    setIsMicTesting(true);
    void window.api.StartMicTest();
  };

  const handleRadioEffectsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    const radioEffects = e.target.value as RadioEffects;
    void window.api.SetRadioEffects(radioEffects);
    setRadioEffects(radioEffects);
    setConfig({ ...config, radioEffects: radioEffects });
    setChangesSaved(SaveStatus.Saved);
  };

  const handleHardwareTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    const hardwareType = parseInt(e.target.value);
    void window.api.SetHardwareType(hardwareType);
    setHardwareType(hardwareType);
    setConfig({ ...config, hardwareType: hardwareType });
    setChangesSaved(SaveStatus.Saved);
  };

  const closeHander = () => {
    void window.api.StopMicTest();
    setIsMicTesting(false);
    closeModal();
  };

  const renderRadioTooltip = (props) => (
    <Tooltip id="button-tooltip" {...props}>
      <div className="text-white">
        <p>
          <strong>Schmid ED-137B:</strong>
          <br />
          Clear audio with slight distortion, emphasising lower frequencies.
        </p>
        <p>
          <strong>Rockwell Collins 2100:</strong>
          <br />
          Typical radio-like distortion, commonly used in Boeing and Airbus aircraft (resembles the
          &quot;Realistic ATC Audio Effect&quot; in the older AFV for Windows client).
        </p>
        <p>
          <strong>Garex 220:</strong> <br />
          Similar to the Schmid ED-137B, but with slightly less distortion and a greater emphasis on
          higher frequencies.
        </p>
      </div>
    </Tooltip>
  );

  return (
    <>
      <div className="modal settingsModalBackground" role="dialog">
        <div className="modal-dialog" role="document">
          <div
            className="modal-content"
            style={{
              border: '0',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="modal-header">
              <h5 className="modal-title">Settings</h5>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="col-6" style={{ float: 'left' }}>
                <div className="form-group" style={{ width: '90%' }}>
                  <h5>VATSIM Details</h5>
                  <div className="col-lg">
                    <label className="mt-2">CID</label>
                    <input
                      className="form-control mt-1"
                      id="cidInput"
                      placeholder="99999"
                      value={cid}
                      onChange={(e) => {
                        // Issue #127: Strip non-digit characters instead of using type="number".
                        const cleanCid = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
                        setCid(cleanCid);
                        debouncedCid(cleanCid);
                      }}
                    ></input>
                    <label className="mt-2">Password</label>
                    <input
                      type="password"
                      className="form-control mt-1"
                      id="passwordInput"
                      placeholder="*******"
                      defaultValue={password}
                      onChange={(e) => debouncedPassword(e.target.value)}
                    ></input>

                    <label className="mt-2">Radio effects</label>
                    <select
                      id=""
                      className="form-control mt-1"
                      value={radioEffects}
                      onChange={handleRadioEffectsChange}
                    >
                      <option value="on">On</option>
                      <option value="input">Input only</option>
                      <option value="output">Output only</option>
                      <option value="off">Off</option>
                    </select>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <label>Radio hardware</label>
                      <OverlayTrigger placement="right" overlay={renderRadioTooltip}>
                        <button type="button" className="info-icon">
                          <Info size={13} />
                        </button>
                      </OverlayTrigger>
                    </div>
                    <select
                      id=""
                      className="form-control mt-1"
                      value={hardwareType}
                      onChange={handleHardwareTypeChange}
                    >
                      <option value="0">Schmid ED-137B</option>
                      <option value="1">Rockwell Collins 2100</option>
                      <option value="2">Garex 220</option>
                    </select>
                  </div>
                  <div className="col-lg">
                    <label className="mt-2">Keep window on top</label>
                    <select
                      id=""
                      className="form-control mt-1"
                      onChange={handleAlwaysOnTop}
                      value={alwaysOnTop}
                    >
                      <option value="always">Always</option>
                      <option value="inMiniMode">In mini mode</option>
                      <option value="never">Never</option>
                    </select>

                    <label className="mt-2">Always show expanded RX</label>
                    <select
                      id=""
                      className="form-control mt-1"
                      onChange={handleShowExpandedRxChange}
                      value={showExpandedRxInfo.toString()}
                    >
                      <option value="true">Always</option>
                      <option value="false">Never</option>
                    </select>

                    {isWindows && (
                      <>
                        <label className="mt-2">Release channel</label>
                        <select
                          id=""
                          className="form-control mt-1"
                          onChange={handleUpdateChannelChange}
                          value={updateChannel.toString()}
                        >
                          <option value="stable">Stable</option>
                          <option value="beta">Beta</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-6" style={{ float: 'right' }}>
                <div className="form-group">
                  <h5>Audio configuration</h5>

                  <label className="mt-2">Audio API</label>
                  <AudioApis
                    apis={audioApis}
                    selectedApiId={config.audioApi}
                    selectApi={(apiId: number) => {
                      changeAudioApi(apiId);
                    }}
                  />
                  <label className="mt-2">Headset device</label>
                  <AudioOutputs
                    devices={audioOutputDevices}
                    selectedDeviceId={config.headsetOutputDeviceId}
                    setDevice={(device): void => {
                      setHeadsetDevice(device.id);
                    }}
                  />
                  <label className="mt-2">Speaker device</label>
                  <AudioOutputs
                    devices={audioOutputDevices}
                    selectedDeviceId={config.speakerOutputDeviceId}
                    setDevice={(device): void => {
                      setSpeakerDevice(device.id);
                    }}
                  />
                  <label className="mt-2">Input device</label>
                  <AudioInput
                    devices={audioInputDevices}
                    selectedDeviceId={config.audioInputDeviceId}
                    setDevice={(device): void => {
                      setInputDevice(device.id);
                    }}
                  />
                  <label className="mt-2">Transparent mini mode</label>
                  <select
                    id=""
                    className="form-control mt-1"
                    onChange={handleTransparentMiniMode}
                    value={transparentMiniMode.toString()}
                  >
                    <option value="true">Always</option>
                    <option value="false">Never</option>
                  </select>
                  <label className="mt-2">Set radio to max volume on TX</label>
                  <select
                    id=""
                    className="form-control mt-1"
                    onChange={handleSetRadioToMaxVolumeOnTX}
                    value={radioToMaxVolumeOnTX.toString()}
                  >
                    <option value="true">Always</option>
                    <option value="false">Never</option>
                  </select>
                  <label className="mt-2">VCCS Theme</label>
                  <select
                    id=""
                    className="form-control mt-1"
                    onChange={handleSetTheme}
                    value={theme}
                  >
                    <option value="default">Default</option>
                    <option value="schmid-ics">Schmid ICS 200 / 60</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              <div className="col-12">
                <button
                  className={clsx(
                    'btn mt-3 w-100',
                    !isMicTesting && 'btn-info',
                    isMicTesting && 'btn-warning'
                  )}
                  onClick={handleMicTest}
                  disabled={
                    !(hasPtt1BeenSetDuringSetup || hasPtt2BeenSetDuringSetup) ||
                    config.headsetOutputDeviceId === '' ||
                    config.speakerOutputDeviceId === '' ||
                    config.audioInputDeviceId === ''
                  }
                >
                  {isMicTesting ? 'Stop mic test' : 'Start mic test'}
                </button>
                <div className="progress mt-2" style={{ height: '4px' }}>
                  <div
                    className="progress-bar bg-success no-amination"
                    role="progressbar"
                    style={{ width: vu.toString() + '%' }}
                  ></div>
                  <div
                    className="progress-bar bg-danger no-amination"
                    role="progressbar"
                    style={{ width: (vuPeak - vu).toString() + '%' }}
                  ></div>
                </div>
              </div>
              <div className="col-6" style={{ float: 'left', paddingRight: '10px' }}>
                <div className="form-group">
                  <button
                    className="btn text-box-container mt-3 w-100"
                    onClick={() => {
                      handleClearPtt(1);
                    }}
                  >
                    {`Ptt 1: ${!hasPtt1BeenSetDuringSetup ? 'Press any key/button' : ptt1KeyName}`}
                  </button>
                  <button
                    className={clsx(
                      'btn mt-2 w-100',
                      !pttIsOn && 'btn-info',
                      pttIsOn && 'btn-warning'
                    )}
                    onClick={() => {
                      handleSetPtt(1, true);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleSetPtt(1, false);
                    }}
                  >
                    Set new PTT 1
                  </button>
                </div>
              </div>
              <div className="col-6" style={{ float: 'right', paddingLeft: '10px' }}>
                <div className="form-group">
                  <button
                    className="btn text-box-container mt-3 w-100"
                    onClick={() => {
                      handleClearPtt(2);
                    }}
                  >
                    {`Ptt 2: ${!hasPtt2BeenSetDuringSetup ? 'Press any key/button' : ptt2KeyName}`}
                  </button>
                  <button
                    className={clsx(
                      'btn mt-2 w-100',
                      !pttIsOn && 'btn-info',
                      pttIsOn && 'btn-warning'
                    )}
                    onClick={() => {
                      handleSetPtt(2, true);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleSetPtt(2, false);
                    }}
                  >
                    Set new PTT 2
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <span>
                {changesSaved === SaveStatus.NoChanges
                  ? 'No changes'
                  : changesSaved === SaveStatus.Saving
                    ? 'Saving changes...'
                    : 'Changes saved'}
              </span>
              <button type="button" className="btn btn-danger m-2" onClick={closeHander}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;

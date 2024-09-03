import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { AudioApi, AudioDevice } from 'trackaudio-afv';
import { useDebouncedCallback } from 'use-debounce';
import { AlwaysOnTopMode, Configuration } from '../../../../../src/main/config';
import useRadioState from '../../store/radioStore';
import useUtilStore from '../../store/utilStore';
import AudioApis from './audio-apis';
import AudioInput from './audio-input';
import AudioOutputs from './audio-outputs';

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
  const [hardwareType, setHardwareType] = useState(0);
  const [config, setConfig] = useState({} as Configuration);
  const [alwaysOnTop, setAlwaysOnTop] = useState<AlwaysOnTopMode>('never');

  const [cid, setCid] = useState('');
  const [password, setPassword] = useState('');

  const [pttIsOn] = useRadioState((state) => [state.pttIsOn]);

  const [
    vu,
    vuPeak,
    updateVu,
    ptt1KeyName,
    ptt2KeyName,
    hasPtt1BeenSetDuringSetup,
    hasPtt2BeenSetDuringSetup,
    updatePtt1KeySet,
    updatePtt2KeySet
  ] = useUtilStore((state) => [
    state.vu,
    state.peakVu,
    state.updateVu,
    state.ptt1KeyName,
    state.ptt2KeyName,
    state.hasPtt1BeenSetDuringSetup,
    state.hasPtt2BeenSetDuringSetup,
    state.updatePtt1KeySet,
    state.updatePtt2KeySet
  ]);
  const [isMicTesting, setIsMicTesting] = useState(false);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        setConfig(config);
        setCid(config.cid);
        setPassword(config.password);
        setHardwareType(config.hardwareType);
        setAlwaysOnTop(config.alwaysOnTop as AlwaysOnTopMode); // Type assertion since the config will never be a boolean at this point
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

  const handleSetPtt = (pttIndex: number) => {
    if (pttIndex === 1) {
      updatePtt1KeySet(false);
    } else if (pttIndex === 2) {
      updatePtt2KeySet(false);
    }

    setChangesSaved(SaveStatus.Saved);
    void window.api.SetupPtt(pttIndex);
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

  const handleHardwareTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    const hardwareType = parseInt(e.target.value);
    void window.api.SetHardwareType(hardwareType);
    setHardwareType(hardwareType);
    setConfig({ ...config, hardwareType: hardwareType });
    setChangesSaved(SaveStatus.Saved);
  };

  const toggleTelemetry = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    const consent = parseInt(e.target.value) == 1 ? true : false;
    void window.api.SetTelemetryConsent(consent);
    config.consentedToTelemetry = consent;
    setChangesSaved(SaveStatus.Saved);
  };

  const closeHander = () => {
    void window.api.StopMicTest();
    setIsMicTesting(false);
    closeModal();
  };

  return (
    <>
      <div className="modal settingsModalBackground" role="dialog">
        <div className="modal-dialog settingsModal" role="document">
          <div className="modal-content" style={{ border: '0' }}>
            <div className="modal-header">
              <h5 className="modal-title">Settings</h5>
            </div>
            <div className="modal-body">
              <div className="col-5" style={{ float: 'left' }}>
                <div className="form-group" style={{ width: '90%' }}>
                  <h5>VATSIM Details</h5>
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

                  <h5 className="mt-4">Other</h5>
                  {/* <label className="mt-1">Radio Effects</label>
                  <select id="" className="form-control mt-1" disabled>
                    <option value="on">On</option>
                    <option value="saab">Input only</option>
                    <option value="mercedes">Output only</option>
                    <option value="audi">Off</option>
                  </select> */}
                  <label className="mt-2">Radio Hardware</label>
                  <select
                    id=""
                    className="form-control mt-1"
                    value={hardwareType}
                    onChange={handleHardwareTypeChange}
                  >
                    <option value="0">Schmid ED-137B</option>
                    <option value="1">Rockwell Collins 2100</option>
                    <option value="2">Garex 220</option>
                    <option value="3">No Hardware (Real Radio Affects disabled)</option>
                  </select>

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

                  <label className="mt-2" style={{ fontSize: '10px' }}>
                    Telemetry
                  </label>
                  <select
                    id=""
                    style={{ fontSize: '10px' }}
                    className="form-control mt-1"
                    onChange={toggleTelemetry}
                    value={config.consentedToTelemetry ? 1 : 0}
                  >
                    <option value="1">Opt in to bug reports</option>
                    <option value="0">Opt out of bug reports</option>
                  </select>
                </div>
              </div>
              <div className="col-7" style={{ float: 'right' }}>
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
                  <button className="btn text-box-container mt-3 w-100">
                    {`Ptt 1: ${!hasPtt1BeenSetDuringSetup ? 'Press any key or button' : ptt1KeyName}`}
                  </button>
                  <button
                    className={clsx(
                      'btn mt-2 w-100',
                      !pttIsOn && 'btn-info',
                      pttIsOn && 'btn-warning'
                    )}
                    onClick={() => {
                      handleSetPtt(1);
                    }}
                  >
                    Set new PTT 1
                  </button>
                  <button className="btn text-box-container mt-3 w-100">
                    {`Ptt 2: ${!hasPtt2BeenSetDuringSetup ? 'Press any key or button' : ptt2KeyName}`}
                  </button>
                  <button
                    className={clsx(
                      'btn mt-2 w-100',
                      !pttIsOn && 'btn-info',
                      pttIsOn && 'btn-warning'
                    )}
                    onClick={() => {
                      handleSetPtt(2);
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

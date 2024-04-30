import React, { useEffect, useState } from "react";
import AudioApis from "./audio-apis";
import AudioInput from "./audio-input";
import AudioOutputs from "./audio-outputs";
import { useDebouncedCallback } from "use-debounce";
import { Configuration } from "../../../config.d";
import useSessionStore from "../../store/sessionStore";
import { getKeyFromNumber } from "../../../helper";
import useUtilStore from "../../store/utilStore";
import clsx from "clsx";

export type SettingsModalProps = {
  closeModal: () => void;
};

export enum SaveStatus {
  NoChanges,
  Saving,
  Saved,
}

const SettingsModal: React.FC<SettingsModalProps> = ({ closeModal }) => {
  const [changesSaved, setChangesSaved] = useState(SaveStatus.NoChanges);
  const [audioApis, setAudioApis] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [hardwareType, setHardwareType] = useState(0);
  const [config, setConfig] = useState({} as Configuration);
  const [alwaysOnTop, setAlwaysOnTop] = useState(0);

  const [isSettingPtt, setIsSettingPtt] = useState(false);
  const [pttKeyName, setPttKeyName] = useSessionStore((state) => [
    state.pttKeyName,
    state.setPttKeyName,
  ]);

  const [cid, setCid] = useState("");
  const [password, setPassword] = useState("");

  const [vu, vuPeak] = useUtilStore((state) => [state.vu, state.peakVu]);
  const [isMicTesting, setIsMicTesting] = useState(false);

  useEffect(() => {
    window.api.getConfig().then((config) => {
      setConfig(config);
      setCid(config.cid || "");
      setPassword(config.password || "");
      setHardwareType(config.hardwareType || 0);
      setPttKeyName(getKeyFromNumber(config.pttKey) || "None");
      setAlwaysOnTop(config.alwaysOnTop ? 1 : 0);
    });

    window.api.getAudioApis().then((apis) => {
      setAudioApis(apis);
    });

    window.api.getAudioOutputDevices(config.audioApi|| -1).then((devices) => {
      setAudioOutputDevices(devices);
    });

    window.api.getAudioInputDevices(config.audioApi || -1).then((devices) => {
      setAudioInputDevices(devices);
    });
  }, []);

  const debouncedCid = useDebouncedCallback((cid) => {
    setChangesSaved(SaveStatus.Saving);
    setCid(cid);
    setConfig({ ...config, cid: cid });
    window.api.setCid(cid);
    setChangesSaved(SaveStatus.Saved);
  }, 500);

  const debouncedPassword = useDebouncedCallback((password) => {
    setChangesSaved(SaveStatus.Saving);
    setPassword(password);
    setConfig({ ...config, password: password });
    window.api.setPassword(password);
    setChangesSaved(SaveStatus.Saved);
  }, 1000);

  const changeAudioApi = (api: number) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setAudioApi(api);
    setConfig({ ...config, audioApi: api });
    window.api.getAudioOutputDevices(api).then((devices) => {
      setAudioOutputDevices(devices);
    });
    window.api.getAudioInputDevices(api).then((devices) => {
      setAudioInputDevices(devices);
    });
    setChangesSaved(SaveStatus.Saved);
  };

  const setInputDevice = (deviceId: string) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setAudioInputDevice(deviceId);
    setConfig({ ...config, audioInputDeviceId: deviceId });
    setChangesSaved(SaveStatus.Saved);
  };

  const setHeadsetDevice = (deviceId: string) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setHeadsetOutputDevice(deviceId);
    setConfig({ ...config, headsetOutputDeviceId: deviceId });
    setChangesSaved(SaveStatus.Saved);
  };

  const setSpeakerDevice = (deviceId: string) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setSpeakerOutputDevice(deviceId);
    setConfig({ ...config, speakerOutputDeviceId: deviceId });
    setChangesSaved(SaveStatus.Saved);
  };

  const handleAlwaysOnTop = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setAlwaysOnTop(e.target.value === "1");
    setAlwaysOnTop(parseInt(e.target.value));
    setChangesSaved(SaveStatus.Saved);
  };

  const handleSetPtt = () => {
    setIsSettingPtt(true);
    window.api.SetupPtt().then(() => {
      setIsSettingPtt(false);
      setChangesSaved(SaveStatus.Saved);
    });
  };

  const handleMicTest = () => {
    if (isMicTesting) {
      window.api.StopMicTest();
      setIsMicTesting(false);
      return;
    }
    setIsMicTesting(true);
    window.api.StartMicTest();
  };

  const handleHardwareTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setChangesSaved(SaveStatus.Saving);
    const hardwareType = parseInt(e.target.value);
    window.api.SetHardwareType(hardwareType);
    setHardwareType(hardwareType);
    setConfig({ ...config, hardwareType: hardwareType });
    setChangesSaved(SaveStatus.Saved);
  };

  const closeHander = () => {
    window.api.StopMicTest();
    setIsMicTesting(false);
    closeModal();
  };

  return (
    <>
      <div className="modal settingsModalBackground" role="dialog">
        <div className="modal-dialog settingsModal" role="document">
          <div className="modal-content" style={{ border: "0" }}>
            <div className="modal-header">
              <h5 className="modal-title">Settings</h5>
            </div>
            <div className="modal-body">
              <div className="col-5" style={{ float: "left" }}>
                <div className="form-group" style={{ width: "90%" }}>
                  <h5>VATSIM Details</h5>
                  <label className="mt-2">CID</label>
                  <input
                    type="number"
                    className="form-control mt-1"
                    id="cidInput"
                    placeholder="99999"
                    defaultValue={cid}
                    onChange={(e) => debouncedCid(e.target.value)}
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
                  </select>

                  <label className="mt-2">Keep window on top</label>
                  <select
                    id=""
                    className="form-control mt-1"
                    onChange={handleAlwaysOnTop}
                    value={alwaysOnTop}
                  >
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
              </div>
              <div className="col-7" style={{ float: "right" }}>
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
                      "btn mt-3 w-100",
                      !isMicTesting && "btn-info",
                      isMicTesting && "btn-warning"
                    )}
                    onClick={handleMicTest}
                    disabled={
                      isSettingPtt ||
                      config.headsetOutputDeviceId === "" ||
                      config.speakerOutputDeviceId === "" ||
                      config.audioInputDeviceId === ""
                    }
                  >
                    {isMicTesting ? "Stop mic test" : "Start mic test"}
                  </button>
                  <div className="progress mt-2" style={{ height: "4px" }}>
                    <div
                      className="progress-bar bg-success no-amination"
                      role="progressbar"
                      style={{ width: vu + "%" }}
                    ></div>
                    <div
                      className="progress-bar bg-danger no-amination"
                      role="progressbar"
                      style={{ width: vuPeak - vu + "%" }}
                    ></div>
                  </div>
                  <button className="btn text-box-container mt-3 w-100">
                    Ptt: {isSettingPtt ? "Press any key" : pttKeyName}
                  </button>
                  <button
                    className="btn btn-info mt-2 w-100"
                    onClick={handleSetPtt}
                  >
                    Set new PTT
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <span>
                {changesSaved === SaveStatus.NoChanges
                  ? "No changes"
                  : changesSaved === SaveStatus.Saving
                  ? "Saving changes..."
                  : changesSaved === SaveStatus.Saved
                  ? "Changes saved"
                  : ""}
              </span>
              <button
                type="button"
                className="btn btn-danger m-2"
                onClick={closeHander}
              >
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

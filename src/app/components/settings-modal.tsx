import React, { useEffect, useState } from "react";
import AudioApis from "./settings-modal/audio-apis";
import AudioInput from "./settings-modal/audio-input";
import AudioOutputs from "./settings-modal/audio-outputs";

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

  useEffect(() => {
    window.api.getAudioApis().then((apis) => {
      setAudioApis(apis);
    });

    window.api.getAudioOutputDevices(-1).then((devices) => {
      setAudioOutputDevices(devices);
    });
  }, []);

  const closeHander = () => {
    closeModal();
  };

  const handleAlwaysOnTop = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChangesSaved(SaveStatus.Saving);
    window.api.setAlwaysOnTop(e.target.value === "1");
    setChangesSaved(SaveStatus.Saved);
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
                  ></input>
                  <label className="mt-2">Password</label>
                  <input
                    type="password"
                    className="form-control mt-1"
                    id="passwordInput"
                    placeholder="*******"
                  ></input>

                  <h5 className="mt-4">Other</h5>
                  <label className="mt-1">Radio Effects</label>
                  <select id="" className="form-control mt-1">
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>
                  <label className="mt-2">Radio Hardware</label>
                  <select id="" className="form-control mt-1">
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>

                  <label className="mt-2">Keep window on top</label>
                  <select
                    id=""
                    className="form-control mt-1"
                    onChange={handleAlwaysOnTop}
                  >
                    <option value="1">Yes</option>
                    <option value="0" selected>
                      No
                    </option>
                  </select>
                </div>
              </div>
              <div className="col-7" style={{ float: "right" }}>
                <div className="form-group">
                  <h5>Audio configuration</h5>

                  <label className="mt-2">Audio API</label>
                  <AudioApis apis={audioApis} />
                  <label className="mt-2">Headset device</label>
                  <AudioOutputs
                    devices={audioOutputDevices}
                    setDevice={(device): void => {
                      console.log(device);
                    }}
                  />
                  <label className="mt-2">Speaker device</label>
                  <AudioOutputs
                    devices={audioOutputDevices}
                    setDevice={(device): void => {
                      console.log(device);
                    }}
                  />
                  <label className="mt-2">Input device</label>
                  <AudioInput />
                  <button className="btn btn-warning mt-3 w-100">
                    Start mic test
                  </button>
                  <div className="progress mt-2" style={{ height: "4px" }}>
                    <div className="progress-bar w-0" role="progressbar"></div>
                  </div>
                  <button className="btn text-box-container mt-3 w-100">
                    Ptt: None
                  </button>
                  <button className="btn btn-info mt-2 w-100">
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

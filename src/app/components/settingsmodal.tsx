import React, { useState } from "react";

export type SettingsModalProps = {
  closeModal: () => void;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ closeModal }) => {
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const closeHander = () => {
    closeModal();
  };

  const saveSettings = () => {
    window.api.setAlwaysOnTop(alwaysOnTop);
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
                    onChange={(choice) =>
                      choice.currentTarget.value === "1"
                        ? setAlwaysOnTop(true)
                        : setAlwaysOnTop(false)
                    }
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

                  <label className="mt-2">Sound API</label>
                  <select id="" className="form-control mt-1">
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>
                  <label className="mt-2">Headset device</label>
                  <select id="" className="form-control mt-1">
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>
                  <label className="mt-2">Speaker device</label>
                  <select id="" className="form-control mt-1">
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>
                  <label className="mt-2">Input device</label>
                  <select id="" className="form-control mt-1">
                    <option value="volvo">Volvo</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>

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
              <button
                type="button"
                className="btn btn-success m-1"
                onClick={saveSettings}
              >
                Save changes
              </button>
              <button
                type="button"
                className="btn btn-danger m-1"
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

import React from "react";
import "../style/navbar.scss";
import Clock from "./clock";
import SettingsModal from "./settings-modal/settings-modal";
import useErrorStore from "../store/errorStore";
import useRadioState from "../store/radioStore";

const Navbar: React.FC = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [radios, removeRadio] = useRadioState((state) => [
    state.radios,
    state.removeRadio,
  ]);
  const postError = useErrorStore((state) => state.postError);

  const handleConnectDisconnect = () => {
    if (isConnected) {
      window.api.disconnect().then(() => {
        radios.map((e) => {
          removeRadio(e.frequency);
        });
        setIsConnected(false);
      });
      return;
    }

    window.api.connect().then((ret) => {
      if (ret) {
        setIsConnected(true);
      } else {
        postError(
          "Error connecting to AFV, check your configuration and credentials."
        );
        setIsConnected(false);
      }
    });
  };

  return (
    <>
      <div className="d-flex flex-md-row align-items-center p-3 px-md-4 mb-3 custom-navbar">
        <Clock />
        <span className="btn text-box-container m-2">Not Connected</span>
        <a
          className="btn btn-info m-2 hide-connect-flex"
          href="#"
          onClick={() => handleConnectDisconnect()}
        >
          {isConnected ? "Disconnect" : "Connect"}
        </a>
        <a
          className="btn btn-info m-2 hide-settings-flex"
          href="#"
          onClick={() => setShowModal(true)}
        >
          Settings
        </a>
      </div>
      {showModal && <SettingsModal closeModal={() => setShowModal(false)} />}
    </>
  );
};

export default Navbar;

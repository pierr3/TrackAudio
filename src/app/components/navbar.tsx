import React, { useState } from "react";
import "../style/navbar.scss";
import Clock from "./clock";
import SettingsModal from "./settings-modal/settings-modal";
import useErrorStore from "../store/errorStore";
import useRadioState from "../store/radioStore";
import useSessionStore from "../store/sessionStore";
import clsx from "clsx";

const Navbar: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [radios, removeRadio] = useRadioState((state) => [
    state.radios,
    state.removeRadio,
  ]);
  const postError = useErrorStore((state) => state.postError);
  const [isConnected, isConnecting, setIsConnecting, setIsConnected] =
    useSessionStore((state) => [
      state.isConnected,
      state.isConnecting,
      state.setIsConnecting,
      state.setIsConnected,
    ]);

  const handleConnectDisconnect = () => {
    if (isConnected) {
      window.api.disconnect().then(() => {
        radios.map((e) => {
          removeRadio(e.frequency);
        });
      });

      return;
    }

    setIsConnecting(true);
    window.api.connect().then((ret) => {
      if (!ret) {
        postError(
          "Error connecting to AFV, check your configuration and credentials."
        );
        setIsConnecting(false);
        setIsConnected(false);
      }
    });
  };

  return (
    <>
      <div className="d-flex flex-md-row align-items-center p-3 px-md-4 mb-3 custom-navbar">
        <Clock />
        <span className="btn text-box-container m-2">Not Connected</span>
        <button
          className={clsx(
            "btn m-2 hide-connect-flex",
            !isConnected && "btn-info",
            isConnecting && "loading-button",
            isConnected && "btn-danger"
          )}
          onClick={() => handleConnectDisconnect()}
          disabled={isConnecting}
        >
          {isConnected
            ? "Disconnect"
            : isConnecting
            ? "Connecting..."
            : "Connect"}
        </button>
        <button
          className="btn btn-info m-2 hide-settings-flex"
          disabled={isConnected || isConnecting}
          onClick={() => setShowModal(true)}
        >
          Settings
        </button>
      </div>
      {showModal && <SettingsModal closeModal={() => setShowModal(false)} />}
    </>
  );
};

export default Navbar;

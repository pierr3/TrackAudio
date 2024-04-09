import React from "react";
import "../style/navbar.scss";
import Clock from "./clock";
import SettingsModal from "./settings-modal";

const Navbar: React.FC = () => {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <>
      <div className="d-flex flex-md-row align-items-center p-3 px-md-4 mb-3 custom-navbar">
        <Clock />
        <span className="btn text-box-container m-2">Not Connected</span>
        <a className="btn btn-info m-2 hide-connect-flex" href="#">
          Connect
        </a>
        <a
          className="btn btn-info m-2 hide-settings-flex"
          href="#"
          onClick={() => setShowModal(true)}
        >
          Settings
        </a>
      </div>
      { showModal && <SettingsModal closeModal={() => setShowModal(false)} /> }
    </>
  );
};

export default Navbar;

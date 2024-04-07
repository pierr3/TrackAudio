import React from "react";
import "../style/navbar.scss";

interface NavbarProps {
  version: string;
}

const Navbar: React.FC<NavbarProps> = ({ version }) => {
  return (
    <>
      <div className="custom-navbar container-fluid navbar w-100 d-flex justify-content-between align-items-center">
        <div className="d-flex justify-content-center position-absolute start-50 translate-middle-x text-center align-items-center">
          <div className="package-text">TrackAudio</div>
        </div>
      </div>
    </>
  );
};

export default Navbar;

import React from "react";
import "../style/navbar.scss";
import Clock from "./clock";

const Navbar: React.FC = () => {
  return (
    <>
    <div className="d-flex flex-md-row align-items-center p-3 px-md-4 mb-3 custom-navbar">
      <Clock />
      <span className="btn text-box-container m-2">Not Connected</span>
      <a className="btn btn-info m-2 hide-connect-flex" href="#">Connect</a> 
      <a className="btn btn-info m-2 hide-settings-flex" href="#">Settings</a>
      {/* <span className="btn text-box-container m-2 fadeshow1">Datasource: Slurper</span> */}
    </div>
    </>
  );
};

export default Navbar;

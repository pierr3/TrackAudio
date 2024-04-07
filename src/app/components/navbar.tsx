import React from "react";
import "../style/navbar.css";

interface NavbarProps {
  version: string;
}

const Navbar: React.FC<NavbarProps> = ({ version }) => {
  return (
    <>
      <button className="btn btn-primary">Hi this is a click</button>
      <h1 className="navbar">Hello world</h1>
    </>
  );
};

export default Navbar;

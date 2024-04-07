import React from "react";
import "../style/navbar.scss";

interface NavbarProps {
  version: string;
}

const Navbar: React.FC<NavbarProps> = ({ version }) => {
  return (
    <>
      <nav className="navbar">
        <form className="form-inline">
          <input
            className="form-control mr-sm-2"
            type="search"
            placeholder="Search"
            aria-label="Search"
          ></input>
          <button
            className="btn btn-info"
            type="submit"
          >
            Search
          </button>
        </form>
      </nav>
    </>
  );
};

export default Navbar;

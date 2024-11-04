import React from 'react';
import RadioStatus from './radio-status';
import useSessionStore from '../../store/sessionStore';

const Sidebar: React.FC = () => {
  const [version] = useSessionStore((state) => [state.version, state.isConnected]);

  return (
    <>
      <div className="box-container right-box hide-right-box d-flex flex-column justify-content-between">
        <RadioStatus />

        <div className="d-flex justify-content-center mt-3 w-100 licenses">
          {version} |&nbsp;
          <a
            href="https://github.com/pierr3/TrackAudio/blob/main/LICENSES_COMPILED.md"
            target="_blank"
            rel="noreferrer"
          >
            Licenses
          </a>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

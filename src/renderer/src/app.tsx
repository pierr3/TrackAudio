import { createRoot } from 'react-dom/client';
import Navbar from './components/navbar';
import RadioContainer from './components/radio/default/radio-container';

import ErrorDialog from './components/error';
import Mini from './components/mini';

import './index.scss';
import './style/app.scss';
import FocusBar from './components/focusBar';
import { useEffect, useState } from 'react';
import IPCInterface from './interfaces/IPCInterface';
import Updater from './components/updater/Updater';
import { UpdateInfo } from 'electron-updater';
import ControlPanel from './components/radio/schmid-ics/RadioContainer';
import useUtilStore from './store/utilStore';

function App() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [theme] = useUtilStore((state) => [state.theme]);
  useEffect(() => {
    IPCInterface.init();
    window.api.log.info('IPCInterface initialized');
    return () => {
      window.api.log.info('IPCInterface destroyed');
      IPCInterface.destroy();
    };
  }, []);

  return (
    <div className="absolute">
      <div>
        <Navbar updateAvailable={updateAvailable !== null} />
        <ErrorDialog />
        <div className="structure">
          <Mini />
          <div className="position-relative structure">
            <div className={`blur-overlay ${updateAvailable ? 'active' : ''}`} />
            <Updater onUpdateFound={setUpdateAvailable} />
            {theme === 'default' && (
              <div className="sub-structure d-flex flex-column h-full">
                <RadioContainer />
                <FocusBar />
              </div>
            )}
            {theme === 'schmid-ics' && (
              <div className="structure d-flex flex-column h-full">
                <ControlPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const root = createRoot(rootElement);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  root.render(<App />);
} else {
  console.error("Could not find element with id 'root'");
}

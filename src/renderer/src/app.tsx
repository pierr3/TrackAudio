import { createRoot } from 'react-dom/client';
import Navbar from './components/navbar';
import RadioContainer from './components/radio/radio-container';

import ErrorDialog from './components/error';
import Mini from './components/mini';

import './index.scss';
import './style/app.scss';
import FocusBar from './components/focusBar';
import { useEffect } from 'react';
import IPCInterface from './interfaces/IPCInterface';

function App() {
  useEffect(() => {
    IPCInterface.init();
    window.api.log.info('IPCInterface initialized');

    return () => {
      window.api.log.info('IPCInterface destroyed');
      IPCInterface.destroy();
    };
  }, []);

  return (
    <>
      <Navbar />
      <ErrorDialog />
      <div className="structure">
        <Mini />
        <div className="sub-structure d-flex flex-column">
          <RadioContainer />
          <FocusBar />
        </div>
        {/* <Sidebar /> */}
      </div>
    </>
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

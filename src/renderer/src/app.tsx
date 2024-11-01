import { createRoot } from 'react-dom/client';
import Navbar from './components/navbar';
import RadioContainer from './components/radio/radio-container';

import ErrorDialog from './components/error';
import Bootstrap from './components/bootstrap';
import Mini from './components/mini';

import './index.scss';
import './style/app.scss';
import FocusBar from './components/focusBar';
// import { useState } from 'react';
// import Updater from './components/updater/Updater';

function App() {
  // const [updateCheckDone, setUpdateCheckDone] = useState(false);

  // if (!updateCheckDone) {
  //   return (
  //     <Updater
  //       onFinish={() => {
  //         setUpdateCheckDone(true);
  //       }}
  //     />
  //   );
  // }

  return (
    <>
      <Bootstrap />
      <Navbar />
      <ErrorDialog />
      <div className="structure">
        <Mini />
        <RadioContainer />
        <FocusBar />
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

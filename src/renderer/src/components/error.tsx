 
import React, { useEffect } from 'react';
import useErrorStore from '../store/errorStore';
import useSound from 'use-sound';

// @ts-expect-error idk this is weird
import errorSfx from '../assets/md80_error.mp3';
import { useMediaQuery } from 'react-responsive';

const ErrorDialog: React.FC = () => {
  const errorStore = useErrorStore((state) => state);
  const isMiniMode = useMediaQuery({ maxWidth: '455px' });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const [play] = useSound(errorSfx);

  useEffect(() => {
    if (errorStore.pending) {
      play();
    }
  }, [errorStore.pending, play]);

  if (!errorStore.pending) {
    return null;
  }

  if (isMiniMode) {
    return;
  }

  return (
    <div className="alert alert-danger alert-popup" role="alert">
      <div style={{ float: 'left' }}>
        {errorStore.messages.map((error, index) => (
          <div key={index}>
            [{error.timestamp}] {error.message}
          </div>
        ))}
      </div>

      <button
        className="btn btn-danger"
        style={{ float: 'right' }}
        onClick={() => {
          errorStore.acknowledge();
        }}
      >
        X
      </button>
    </div>
  );
};

export default ErrorDialog;

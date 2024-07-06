/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { useEffect } from 'react';
import useErrorStore from '../store/errorStore';
import useSound from 'use-sound';

// @ts-expect-error idk this is weird
import errorSfx from "../assets/md80_error.mp3";

const ErrorDialog: React.FC = () => {
  const errorStore = useErrorStore((state) => state);

  const [play] = useSound(errorSfx);

  useEffect(() => {
    if (errorStore.pending) {
      play();
    }
  }, [errorStore.pending, play]);

  if (!errorStore.pending) {
    return null;
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

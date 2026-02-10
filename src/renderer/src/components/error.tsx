import React from 'react';
import useErrorStore from '../store/errorStore';
import { useMediaQuery } from 'react-responsive';

const ErrorDialog: React.FC = () => {
  const errorStore = useErrorStore((state) => state);
  const isMiniMode = useMediaQuery({ maxWidth: '455px' });

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

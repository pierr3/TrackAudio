import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import React from 'react';
import { TrashFill } from 'react-bootstrap-icons';

const DeleteMultipleRadios: React.FC = () => {
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const [radiosToBeDeleted, removeRadio, setPendingDeletion] = useRadioState((state) => [
    state.radiosSelected,
    state.removeRadio,
    state.setPendingDeletion
  ]);

  const handleDeleteRadios = () => {
    radiosToBeDeleted.forEach((radio) => {
      setPendingDeletion(radio.frequency, true);
      awaitEndOfRxForDeletion(radio.frequency);
    });
  };

  const awaitEndOfRxForDeletion = (frequency: number): void => {
    const interval = setInterval(
      (frequency: number) => {
        const radio = useRadioState.getState().radios.find((r) => r.frequency === frequency);
        if (!radio) {
          clearInterval(interval);
          return;
        }

        if (!radio.currentlyRx && !radio.currentlyTx) {
          void window.api.removeFrequency(radio.frequency);
          removeRadio(radio.frequency);
          clearInterval(interval);
        }
      },
      60,
      frequency
    );

    // Clear the interval after 5 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);
  };

  return (
    <div className="d-flex h-100 align-items-center">
      <button
        className="btn btn-danger hide-settings-flex"
        disabled={!isConnected}
        onClick={() => {
          handleDeleteRadios();
        }}
      >
        <TrashFill />
      </button>
    </div>
  );
};

export default DeleteMultipleRadios;

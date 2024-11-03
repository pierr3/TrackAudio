import useRadioState from '@renderer/store/radioStore';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import React from 'react';
import { TrashFill } from 'react-bootstrap-icons';

const DeleteMultipleRadios: React.FC = () => {
  const [isConnected] = useSessionStore((state) => [state.isConnected]);
  const [radiosToBeDeleted, radios, removeRadio, setPendingDeletion] = useRadioState((state) => [
    state.radiosSelected,
    state.radios,
    state.removeRadio,
    state.setPendingDeletion
  ]);

  const [setIsEditMode] = useUtilStore((state) => [state.setIsEditMode]);

  const handleDeleteRadios = () => {
    if (radiosToBeDeleted.length == 0) {
      radios.forEach((radio) => {
        if (radio.callsign !== 'UNICOM' && radio.callsign !== 'GUARD') {
          setPendingDeletion(radio.frequency, false);
          awaitEndOfRxForDeletion(radio.frequency);
        }
      });
    } else {
      radiosToBeDeleted.forEach((radio) => {
        setPendingDeletion(radio.frequency, true);
        awaitEndOfRxForDeletion(radio.frequency);
      });
    }
    setIsEditMode(false);
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
        title="Delete all or selected radios"
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

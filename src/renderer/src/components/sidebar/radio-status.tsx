import React from 'react';
import useRadioState, { RadioHelper } from '../../store/radioStore';

const RadioStatus: React.FC = () => {
  const [selectedRadio] = useRadioState((state) => [state.getSelectedRadio()]);

  if (!selectedRadio) {
    return;
  }

  return (
    <div className="d-flex flex-row gap-2">
      <div style={{ textAlign: 'center' }} className=" mb-0">
        Callsign:
      </div>
      <span className="text-info">{selectedRadio.callsign}</span>
      <span>Frequency: </span>
      <span className="text-info">
        {RadioHelper.convertHzToMhzString(selectedRadio.frequency)}{' '}
        {selectedRadio.humanFrequencyAlias && `| ${selectedRadio.humanFrequencyAlias}`}
      </span>
      <span>Transceivers: </span>
      <span className="text-warning">
        {selectedRadio.callsign !== 'MANUAL' ? selectedRadio.transceiverCount : 'MAN'}
      </span>
    </div>
  );
};

export default RadioStatus;

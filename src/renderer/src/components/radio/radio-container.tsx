import React from 'react';
import Radio from './radio';
import useRadioState from '../../store/radioStore';

const RadioContainer: React.FC = () => {
  const radios = useRadioState((state) => state.radios);
  return (
    <>
      <div className="box-container freq-box">
        <div className="container">
          <div className="row">
            {radios.map((radio) => (
              <Radio key={radio.frequency} radio={radio} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default RadioContainer;

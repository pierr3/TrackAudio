import React, { useMemo } from 'react';
import Radio from './radio';
import useRadioState from '../../store/radioStore';
import UnicomGuardBar from './unicom-guard';

const RadioContainer: React.FC = () => {
  const radios = useRadioState((state) => state.radios);

  const filteredRadios = useMemo(() => {
    return radios.filter(
      (radio) => radio.frequency !== 0 && radio.frequency !== 122.8e6 && radio.frequency !== 121.5e6
    );
  }, [radios]);

  return (
    <>
      <div className="box-container freq-box">
        <div className="unicon-overall-container">
          <UnicomGuardBar />
        </div>

        <div className="container">
          <div className="row" style={{ margin: 'auto' }}>
            {filteredRadios.map((radio) => (
              <Radio key={radio.frequency} radio={radio} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default RadioContainer;

import React, { useMemo } from 'react';
import Radio from './radio';
import useRadioState from '../../store/radioStore';
import UnicomGuardBar from './unicom-guard';
import UnicomGuardContainer from './unicom-guard-container';

const RadioContainer: React.FC = () => {
  const radios = useRadioState((state) => state.radios);

  const filteredRadios = useMemo(() => {
    return radios.filter(
      (radio) => radio.frequency !== 0 && radio.frequency !== 122.8e6 && radio.frequency !== 121.5e6
    );
  }, [radios]);

  return (
    <>
      <div className="h-100 mx-3 d-flex justify-content-center flex-column">
        <div className="d-flex unicon-overall-container">
          <UnicomGuardContainer />
        </div>

        <div className="box-container h-100 w-100">
          <div className="row mx-1">
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

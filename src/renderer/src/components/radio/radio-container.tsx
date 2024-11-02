import React, { useMemo } from 'react';
import Radio from './radio';
import useRadioState from '../../store/radioStore';
import TopBarContainer from './top-bar-container';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import ExpandedRxInfo from './expanded-rx-info';
import { useMediaQuery } from 'react-responsive';
import AddStation from '../sidebar/add-station';
import AddFrequency from '../sidebar/add-frequency';

const RadioContainer: React.FC = () => {
  const radios = useRadioState((state) => state.radios);
  const [isConnected, isNetworkConnected] = useSessionStore((state) => [
    state.isConnected,
    state.isNetworkConnected
  ]);
  const isWideScreen = useMediaQuery({ minWidth: '790px' });
  const filteredRadios = useMemo(() => {
    return radios.filter(
      (radio) => radio.frequency !== 0 && radio.frequency !== 122.8e6 && radio.frequency !== 121.5e6
    );
  }, [radios]);
  const [showExpandedRxInfo] = useUtilStore((state) => [state.showExpandedRxInfo]);

  if (!isNetworkConnected) {
    return (
      <div className="h-100 mx-3 d-flex justify-content-center flex-column gap-0.5 hide-topbar">
        <div className="d-flex justify-content-center radio-text  text-center">
          No VATSIM connection found!
        </div>
        <div className="d-flex justify-content-center radio-sub-text text-muted text-center">
          Ensure you have established a valid connection to the VATSIM network before attempting to
          connect to AFV.
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-100 mx-3 d-flex justify-content-center flex-column gap-0.5 hide-topbar">
        <div className="d-flex justify-content-center radio-text  text-center">
          VATSIM connection found!
        </div>
        <div className="d-flex justify-content-center radio-sub-text text-muted text-center">
          Click the connect button to establish a connection to AFV.
        </div>
      </div>
    );
  }

  return (
    <div className="h-100 px-4 pt-3 pb-3 d-flex flex-column">
      <div className="d-flex unicon-overall-container mb-3">
        <TopBarContainer />
      </div>

      <div className="d-flex flex-column hide-topbar sub-sub-structure">
        <div className="h-100 d-flex gap-3">
          <div
            className={`box-container ${showExpandedRxInfo && isWideScreen ? 'radio-list-expanded' : 'w-100'}`}
          >
            {filteredRadios.length === 0 ? (
              <div className="d-flex justify-content-center flex-column radio-text  h-100 w-100">
                <div
                  className="container d-flex flex-column justify-content-center  h-100 align-items-center gap-4"
                  style={{ paddingBottom: '0' }}
                >
                  <div className="w-50">
                    <AddStation />
                  </div>
                  <div className="w-50">
                    <AddFrequency />
                  </div>
                </div>
              </div>
            ) : (
              <div className="row mx-1 mt-1 gap-3">
                {filteredRadios.map((radio) => (
                  <Radio key={radio.frequency} radio={radio} />
                ))}
              </div>
            )}
          </div>

          {showExpandedRxInfo && isWideScreen && (
            <div
              className="box-container w-25 h-100"
              style={{
                maxWidth: '220px',
                minWidth: '200px'
              }}
            >
              <ExpandedRxInfo />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RadioContainer;

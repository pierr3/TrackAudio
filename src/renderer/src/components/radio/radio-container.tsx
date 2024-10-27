import React, { useMemo } from 'react';
import Radio from './radio';
import useRadioState from '../../store/radioStore';
import TopBarContainer from './top-bar-container';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import ExpandedRxInfo from './expanded-rx-info';
import { useMediaQuery } from 'react-responsive';

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
    <>
      <div className="h-100 mx-3 d-flex justify-content-center flex-column hide-topbar">
        <div className="d-flex unicon-overall-container">
          <TopBarContainer />
        </div>

        <div className="d-flex sub-structure w-100 d-flex gap-3">
          <div
            className={`box-container ${showExpandedRxInfo && isWideScreen ? 'radio-list-expanded' : 'w-100'} h-100`}
          >
            {filteredRadios.length === 0 ? (
              <div className="d-flex justify-content-center radio-text text-muted"></div>
            ) : (
              <div className="row mx-1">
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
              {/* Content for the right box-container */}
              <ExpandedRxInfo />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RadioContainer;

import React, { useMemo, useState, useEffect } from 'react';
import Radio from './radio';
import useRadioState from '../../store/radioStore';
import TopBarContainer from './top-bar-container';
import useSessionStore from '@renderer/store/sessionStore';
import useUtilStore from '@renderer/store/utilStore';
import ExpandedRxInfo from './expanded-rx-info';
import AddStation from '../sidebar/add-station';
import AddFrequency from '../sidebar/add-frequency';

const LOADING_DELAY = 500;
const EXCLUDED_FREQUENCIES = [0];
const UNICOM_EXCLUDED_FREQUENCIES = [122.8e6, 121.5e6];

const RadioContainer: React.FC = () => {
  const [radios, showingUnicomBar] = useRadioState((state) => [
    state.radios,
    state.showingUnicomBar
  ]);
  const [isConnected, isNetworkConnected, isAtc] = useSessionStore((state) => [
    state.isConnected,
    state.isNetworkConnected,
    state.isAtc
  ]);
  const [showExpandedRxInfo] = useUtilStore((state) => [state.showExpandedRxInfo]);

  const [uiState, setUiState] = useState<null | 'add-station' | 'show-radios'>();

  // Filter radios once when the array changes
  const filteredRadios = useMemo(() => {
    const excludedFreqs = showingUnicomBar
      ? [...EXCLUDED_FREQUENCIES, ...UNICOM_EXCLUDED_FREQUENCIES]
      : EXCLUDED_FREQUENCIES;
    return radios.filter((radio) => !excludedFreqs.includes(radio.frequency));
  }, [radios, showingUnicomBar]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isConnected) {
      setUiState(null);
      return;
    }

    if (filteredRadios.length === 0) {
      if (!isAtc) {
        setUiState('add-station');
        return;
      }
      timer = setTimeout(() => {
        if (filteredRadios.length === 0) {
          setUiState('add-station');
        }
      }, LOADING_DELAY);
    } else {
      setUiState('show-radios');
    }

    return () => {
      clearTimeout(timer);
    };
  }, [filteredRadios, isAtc]);

  if (!isNetworkConnected) {
    return (
      <div className="h-100 mx-3 d-flex justify-content-center flex-column gap-0.5 hide-topbar">
        <div className="d-flex justify-content-center radio-text text-center">
          No VATSIM connection detected!
        </div>
        <div className="d-flex justify-content-center radio-sub-text text-muted text-center">
          Please ensure your ATC client is running and connected to the VATSIM network.
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-100 mx-3 d-flex justify-content-center flex-column gap-0.5 hide-topbar">
        <div className="d-flex justify-content-center radio-text text-center">
          VATSIM connection detected!
        </div>
        <div className="d-flex justify-content-center radio-sub-text text-muted text-center">
          Click the connect button to establish a connection to the VATSIM audio network.
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
          <div className={`box-container ${showExpandedRxInfo ? 'radio-list-expanded' : 'w-100'}`}>
            {uiState === 'add-station' && (
              <div className="d-flex justify-content-center flex-column radio-text h-100 w-100">
                <div
                  className="container d-flex flex-column justify-content-center h-100 align-items-center gap-4"
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
            )}

            {uiState === 'show-radios' && (
              <div className="row mx-1 mt-1 gap-3">
                {filteredRadios.map((radio) => (
                  <Radio key={radio.frequency} radio={radio} />
                ))}
              </div>
            )}
          </div>

          {showExpandedRxInfo && (
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

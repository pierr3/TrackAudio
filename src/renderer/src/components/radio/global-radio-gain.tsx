import useSessionStore from '@renderer/store/sessionStore';
import '../../style/GlobalRadio.scss';
import { useCallback, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';

const GlobalRadioGain = () => {
  const [masterGain, setMasterGain] = useSessionStore((state) => [
    state.radioGain,
    state.setRadioGain
  ]);

  const isWideScreen = useMediaQuery({ minWidth: '895px' });

  const setStoredGain = () => {
    const storedGain = window.localStorage.getItem('MainRadioGain');
    if (storedGain) {
      const gainValue = parseInt(storedGain);
      if (!isNaN(gainValue)) {
        {
          setMasterGain(gainValue);
        }
      }
    }
  };

  useEffect(() => {
    setStoredGain();
  }, []);

  const handleRadioGainChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMasterGain(event.target.valueAsNumber);
      window.localStorage.setItem('MainRadioGain', event.target.value);
    },
    [setMasterGain]
  );

  const handleRadioGainMouseWheel = useCallback(
    (event: React.WheelEvent<HTMLInputElement>) => {
      const newValue = Math.min(Math.max(masterGain + (event.deltaY > 0 ? -1 : 1), 0), 100);
      setMasterGain(newValue);
      window.localStorage.setItem('MainRadioGain', newValue.toString());
    },
    [masterGain, setMasterGain]
  );

  return (
    <div
      className="unicom-bar-container d-flex gap-2"
      style={{
        width: isWideScreen ? '175px' : '135px'
      }}
    >
      {isWideScreen && (
        <span className="unicom-text">
          <div
            className="text-grey"
            style={{
              lineHeight: '29px'
            }}
          >
            MAIN
          </div>
        </span>
      )}
      <div
        className="d-flex w-100 h-100 align-items-center"
        style={{
          paddingRight: '10px'
        }}
      >
        <input
          type="range"
          className="form-range unicom-text global-volume-bar"
          min="0"
          max="100"
          step="1"
          onChange={handleRadioGainChange}
          onWheel={handleRadioGainMouseWheel}
          value={masterGain}
          title={`Master Volume: ${masterGain.toString()}%`}
        />
      </div>
    </div>
  );
};

export default GlobalRadioGain;

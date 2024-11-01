import useSessionStore from '@renderer/store/sessionStore';
import '../../style/GlobalRadio.scss';
import { useEffect } from 'react';
import { Configuration } from 'src/shared/config.type';
const GlobalRadioGain = () => {
  const [radioGain, setRadioGain] = useSessionStore((state) => [
    state.radioGain,
    state.setRadioGain
  ]);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        const gain = config.radioGain || 0.5;
        const UiGain = gain * 100 || 50;

        window.api
          .SetRadioGain(gain)
          .then(() => {
            setRadioGain(UiGain);
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [setRadioGain]);

  const updateRadioGainValue = (newGain: number) => {
    window.api
      .SetRadioGain(newGain / 100)
      .then(() => {
        setRadioGain(newGain);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const handleRadioGainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateRadioGainValue(event.target.valueAsNumber);
  };

  const handleRadioGainMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(Math.max(radioGain + (event.deltaY > 0 ? -1 : 1), 0), 100);
    updateRadioGainValue(newValue);
  };

  return (
    <div
      className="unicom-bar-container d-flex gap-2"
      style={{
        width: '135px',
        marginRight: '40px'
      }}
    >
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
          value={radioGain}
        />
      </div>
    </div>
  );
};
export default GlobalRadioGain;

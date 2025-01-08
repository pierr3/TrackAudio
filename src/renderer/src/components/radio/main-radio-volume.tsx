import useSessionStore from '@renderer/store/sessionStore';
import '../../style/GlobalRadio.scss';
import { useEffect } from 'react';
import { Configuration } from 'src/shared/config.type';

const MainRadioVolume: React.FC = () => {
  const [mainRadioVolume, setMainRadioVolume] = useSessionStore((state) => [
    state.mainRadioVolume,
    state.setMainRadioVolume
  ]);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        window.api
          .SetMainRadioVolume(config.mainRadioVolume)
          .then(() => {
            console.log('Main radio volume set to', config.mainRadioVolume);
            setMainRadioVolume(config.mainRadioVolume);
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [setMainRadioVolume]);

  const handleRadioVolumeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newVolume = event.target.valueAsNumber;
    if (Number.isNaN(newVolume)) return;

    setMainRadioVolume(newVolume);

    window.api.SetMainRadioVolume(newVolume).catch((err: unknown) => {
      console.error(err);
    });
  };

  const handleRadioVolumeMouseWheel = (event: React.WheelEvent<HTMLInputElement>): void => {
    const newValue = Math.min(Math.max(mainRadioVolume + (event.deltaY > 0 ? -1 : 1), 0), 100);

    setMainRadioVolume(newValue);
    window.api.SetMainRadioVolume(newValue).catch((err: unknown) => {
      console.error(err);
    });
  };

  return (
    <div className="unicom-bar-container d-flex gap-2" style={{ width: '175px' }}>
      <span className="unicom-text">
        <div className="text-grey" style={{ lineHeight: '29px' }}>
          MAIN
        </div>
      </span>
      <div className="d-flex w-100 h-100 align-items-center" style={{ paddingRight: '10px' }}>
        <input
          type="range"
          className="form-range unicom-text main-volume-bar"
          min={0}
          max={100}
          step={1}
          onChange={handleRadioVolumeChange}
          onWheel={handleRadioVolumeMouseWheel}
          value={mainRadioVolume}
        />
      </div>
    </div>
  );
};

export default MainRadioVolume;

import clsx from 'clsx';
import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Overlay, Popover } from 'react-bootstrap';
import { Configuration } from '../../../shared/config.type';

const MicLoopbackControl: React.FC = () => {
  const [showPopover, setShowPopover] = useState(false);
  const [loopbackEnabled, setLoopbackEnabled] = useState(false);
  const [loopbackGain, setLoopbackGain] = useState(50);
  const target = useRef(null);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        setLoopbackEnabled(config.loopbackEnabled);
        setLoopbackGain(config.loopbackGain);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, []);

  const handleToggleEnabled = () => {
    const newValue = !loopbackEnabled;
    setLoopbackEnabled(newValue);
    window.api.setLoopbackEnabled(newValue);
  };

  const handleGainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.valueAsNumber;
    if (Number.isNaN(newValue)) return;

    setLoopbackGain(newValue);
    window.api.setLoopbackGain(newValue);
  };

  const handleGainMouseWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    const newValue = Math.min(Math.max(loopbackGain + (event.deltaY > 0 ? -1 : 1), 0), 100);

    setLoopbackGain(newValue);
    window.api.setLoopbackGain(newValue);
  };

  return (
    <>
      <button
        ref={target}
        className={clsx('btn hide-settings-flex', loopbackEnabled ? 'btn-success' : 'btn-primary')}
        title="Microphone loopback"
        onClick={() => {
          setShowPopover((current) => !current);
        }}
      >
        {loopbackEnabled ? <Mic size={15} /> : <MicOff size={15} />}
      </button>
      <Overlay
        target={target.current}
        show={showPopover}
        placement="bottom"
        rootClose
        onHide={() => {
          setShowPopover(false);
        }}
      >
        <Popover id="mic-loopback-popover">
          <Popover.Body>
            <div className="d-flex flex-column gap-2" style={{ minWidth: '200px' }}>
              <div className="d-flex justify-content-between align-items-center gap-2">
                <span className="text-grey">MIC LOOPBACK</span>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={loopbackEnabled}
                    onChange={handleToggleEnabled}
                  />
                </div>
              </div>
              <input
                type="range"
                className="form-range unicom-text"
                min={0}
                max={100}
                step={1}
                value={loopbackGain}
                onChange={handleGainChange}
                onWheel={handleGainMouseWheel}
              />
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
};

export default MicLoopbackControl;

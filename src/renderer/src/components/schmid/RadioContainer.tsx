import React, { useEffect, FC } from 'react';
import useUtilStore from '@renderer/store/utilStore';
import clsx from 'clsx';
import useSessionStore from '@renderer/store/sessionStore';
import { useRadioChannelsGrid } from './Radio';
import UnicomGuardBar from '../radio/unicom-guard';
import useRadioState from '@renderer/store/radioStore';

// Interfaces for component props
interface BaseProps {
  children?: React.ReactNode;
  className?: string;
}

interface TimeDisplayProps {
  time: string;
}

interface ButtonProps extends BaseProps {
  label: string;
  active?: boolean;
  variant?: 'primary' | 'secondary';
}

interface EmptySlotProps {
  index: number;
}

interface ControlColumnProps {
  title: string;
  phoneLabel: string;
}

// Base button component for all controls
const BaseButton: FC<BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <button className={clsx('schmid-button', 'fw-bold mb-1', className)} {...props}>
    {children}
  </button>
);

// Time display component
const TimeDisplay: FC<TimeDisplayProps> = ({ time }) => (
  <div className="schmid-time mb-2">
    <div className="h-100 text-black ms-2 fw-bold d-flex align-items-center justify-content-start">
      {time}
    </div>
  </div>
);

// Active location button component
const ActiveLocation: FC<{ callsign: string }> = ({ callsign }) => (
  <div
    className="schmid-button container-left blue text-white position-relative mb-1"
    style={{ height: '60px' }}
  >
    <div className="position-absolute" style={{ left: '5px', fontSize: '0.6rem' }}>
      active
    </div>
    <div className="h-100 d-flex align-items-center justify-content-center fw-bold">{callsign}</div>
  </div>
);

// Empty slot button
const EmptySlot: FC<EmptySlotProps> = ({ index }) => (
  <div
    key={index}
    className="text-white p-2 mb-1 schmid-button container-left"
    style={{ height: '60px' }}
  />
);

// Control button component
const ControlButton: FC<ButtonProps> = ({
  label,
  active = false,
  variant = 'secondary',
  className = ''
}) => (
  <BaseButton className={clsx(className, { active: active, blue: variant === 'primary' })}>
    {label}
  </BaseButton>
);

// Control column component
const ControlColumn: FC<ControlColumnProps> = ({ title, phoneLabel }) => (
  <div className="col">
    <ControlButton label={title} />
    <div className="d-flex flex-column">
      {Array.from({ length: 7 }).map((_, index) => (
        <ControlButton key={index} label="" className="schmid-middle-button" />
      ))}
      <div className="col-2">
        <ControlButton label={phoneLabel} />
      </div>
    </div>
  </div>
);

const ControlPanel: FC = () => {
  const time = useUtilStore((state) => state.time);
  const [localTime, setLocalTime] = React.useState<string>('XX:XX:XX');
  const radioChannelsGrid = useRadioChannelsGrid();
  const [showingUnicomBar, setShowUnicomBar] = useRadioState((state) => [
    state.showingUnicomBar,
    state.setShowingUnicomBar
  ]);
  const [isConnected, isNetworkConnected, callsign] = useSessionStore((state) => [
    state.isConnected,
    state.isNetworkConnected,
    state.callsign
  ]);

  useEffect(() => {
    if (showingUnicomBar) {
      setShowUnicomBar(false);
    }

    return () => {
      setShowUnicomBar(true);
    };
  }, [showingUnicomBar]);

  useEffect(() => {
    const formatTime = (dateObject: Date): string => {
      const hour = dateObject.getUTCHours().toString().padStart(2, '0');
      const minute = dateObject.getUTCMinutes().toString().padStart(2, '0');
      const second = dateObject.getUTCSeconds().toString().padStart(2, '0');
      return `${hour}:${minute}:${second}`;
    };

    setLocalTime(formatTime(new Date()));
  }, [time]);

  const controlColumns: ControlColumnProps[] = [
    { title: 'Volume', phoneLabel: 'Phone A' },
    { title: 'Info', phoneLabel: 'Phone B' },
    { title: 'Short Term R.', phoneLabel: 'Phone C' },
    { title: 'Radio Add 1', phoneLabel: 'Phone D' },
    { title: 'Radio Add 2', phoneLabel: 'Phone E' },
    { title: 'Monitor', phoneLabel: 'Dial' }
  ];

  const NetworkDisconnectedMessage = () => (
    <div className="h-100 mx-3 d-flex justify-content-center flex-column gap-0.5 hide-topbar">
      <div className="d-flex justify-content-center radio-text text-center">
        No VATSIM connection detected!
      </div>
      <div className="d-flex justify-content-center radio-sub-text text-muted text-center">
        Please ensure your ATC client is running and connected to the VATSIM network.
      </div>
    </div>
  );

  const WaitingForConnectionMessage = () => (
    <div className="h-100 mx-3 d-flex justify-content-center flex-column gap-0.5 hide-topbar">
      <div className="d-flex justify-content-center radio-text text-center">
        VATSIM connection detected!
      </div>
      <div className="d-flex justify-content-center radio-sub-text text-muted text-center">
        Click the connect button to establish a connection to the VATSIM audio network.
      </div>
    </div>
  );

  if (!isNetworkConnected) {
    return <NetworkDisconnectedMessage />;
  }

  if (!isConnected) {
    return <WaitingForConnectionMessage />;
  }

  return (
    <div className="d-flex justify-content-center align-items-center main-container h-100">
      <div className="schmid-container p-2 m-4">
        <div className="d-flex justify-content-between h-full">
          {/* Left Column */}
          <div className="schmid-left-column">
            <div className="schmid-left-column">
              <TimeDisplay time={localTime} />
              <ActiveLocation callsign={callsign} />
              {Array.from({ length: 5 }).map((_, index) => (
                <EmptySlot key={index} index={index} />
              ))}
            </div>

            <div className="d-flex justify-content-between gap-1 schmid-left-column">
              <ControlButton label="Conf." />
              <ControlButton label="Transfer" />
            </div>
            <div className="d-flex justify-content-between gap-1 schmid-left-column">
              <ControlButton label="Pickup" />
              <ControlButton label="Divert" />
            </div>
            <div className="d-flex justify-content-between gap-1 schmid-left-column">
              <ControlButton label="End Tel" />
              <ControlButton label="Prio" />
            </div>
          </div>

          {/* Middle Column - Control Grid */}
          <div className="ms-2 schmid-middle-column d-flex">
            {controlColumns.map((column, index) => (
              <ControlColumn key={index} {...column} />
            ))}
          </div>

          {/* Right Column - Radio Channels */}
          <div className="schmid-right-column">
            <div className="row g-2">
              {radioChannelsGrid}

              {/* Bottom Buttons */}
              <div className="col-4">
                <ControlButton label="Details" />
              </div>
              <div className="col-4">
                <ControlButton label="Couple" />
              </div>
              <div className="col-4">
                <ControlButton label="FIC" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <UnicomGuardBar />
    </div>
  );
};

export default ControlPanel;

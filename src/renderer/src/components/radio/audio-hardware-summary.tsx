import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AudioDevice } from 'trackaudio-afv';
import { Configuration } from '../../../../shared/config.type';

export const AUDIO_CONFIG_CHANGED_EVENT = 'trackaudio-audio-config-changed';

type DeviceStatus =
  | { state: 'loading' }
  | { state: 'unset' }
  | { state: 'unavailable' }
  | { state: 'set'; name: string };

const resolveDeviceStatus = (devices: AudioDevice[], deviceId: string): DeviceStatus => {
  if (!deviceId) {
    return { state: 'unset' };
  }
  const match = devices.find((device) => device.id === deviceId);
  return match ? { state: 'set', name: match.name } : { state: 'unavailable' };
};

interface DeviceLineProps {
  label: string;
  status: DeviceStatus;
}

const DeviceLine: React.FC<DeviceLineProps> = ({ label, status }) => {
  const isProblem = status.state === 'unset' || status.state === 'unavailable';
  const isLoading = status.state === 'loading';

  let text: string;
  if (status.state === 'set') {
    text = status.name;
  } else if (status.state === 'unavailable') {
    text = 'Unavailable';
  } else if (status.state === 'unset') {
    text = 'Not configured';
  } else {
    text = '…';
  }

  return (
    <div className="d-flex justify-content-center gap-2">
      <span className="text-muted">{label}:</span>
      <span
        className={clsx(isProblem && 'text-danger fw-bold', isLoading && 'text-muted')}
        title={status.state === 'set' ? status.name : undefined}
      >
        {text}
      </span>
    </div>
  );
};

const AudioHardwareSummary: React.FC = () => {
  const [inputStatus, setInputStatus] = useState<DeviceStatus>({ state: 'loading' });
  const [headsetStatus, setHeadsetStatus] = useState<DeviceStatus>({ state: 'loading' });
  const [speakerStatus, setSpeakerStatus] = useState<DeviceStatus>({ state: 'loading' });
  const isActive = useRef(true);
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const thisRequest = ++requestId.current;
    const isStale = (): boolean => !isActive.current || thisRequest !== requestId.current;

    window.api
      .getConfig()
      .then((config: Configuration) => {
        if (isStale()) {
          return;
        }

        if (config.audioApi < 0) {
          setInputStatus({ state: 'unset' });
          setHeadsetStatus({ state: 'unset' });
          setSpeakerStatus({ state: 'unset' });
          return;
        }

        window.api
          .getAudioInputDevices(config.audioApi)
          .then((devices: AudioDevice[]) => {
            if (isStale()) {
              return;
            }
            setInputStatus(resolveDeviceStatus(devices, config.audioInputDeviceId));
          })
          .catch((err: unknown) => {
            console.error(err);
          });

        window.api
          .getAudioOutputDevices(config.audioApi)
          .then((devices: AudioDevice[]) => {
            if (isStale()) {
              return;
            }
            setHeadsetStatus(resolveDeviceStatus(devices, config.headsetOutputDeviceId));
            setSpeakerStatus(resolveDeviceStatus(devices, config.speakerOutputDeviceId));
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    isActive.current = true;
    refresh();

    window.addEventListener('focus', refresh);
    window.addEventListener(AUDIO_CONFIG_CHANGED_EVENT, refresh);

    return () => {
      isActive.current = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener(AUDIO_CONFIG_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return (
    <div className="d-flex justify-content-center radio-sub-text mt-3">
      <div className="d-flex flex-column gap-0.5">
        <DeviceLine label="Microphone" status={inputStatus} />
        <DeviceLine label="Headset" status={headsetStatus} />
        <DeviceLine label="Speaker" status={speakerStatus} />
      </div>
    </div>
  );
};

export default AudioHardwareSummary;

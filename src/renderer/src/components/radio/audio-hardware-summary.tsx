import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AudioDevice } from 'trackaudio-afv';
import useUtilStore from '@renderer/store/utilStore';

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
  const audioApi = useUtilStore((state) => state.audioApi);
  const audioInputDeviceId = useUtilStore((state) => state.audioInputDeviceId);
  const headsetOutputDeviceId = useUtilStore((state) => state.headsetOutputDeviceId);
  const speakerOutputDeviceId = useUtilStore((state) => state.speakerOutputDeviceId);
  const audioConfigLoaded = useUtilStore((state) => state.audioConfigLoaded);

  const [inputStatus, setInputStatus] = useState<DeviceStatus>({ state: 'loading' });
  const [headsetStatus, setHeadsetStatus] = useState<DeviceStatus>({ state: 'loading' });
  const [speakerStatus, setSpeakerStatus] = useState<DeviceStatus>({ state: 'loading' });

  useEffect(() => {
    if (!audioConfigLoaded) {
      return;
    }

    if (audioApi < 0) {
      setInputStatus({ state: 'unset' });
      setHeadsetStatus({ state: 'unset' });
      setSpeakerStatus({ state: 'unset' });
      return;
    }

    let cancelled = false;

    window.api
      .getAudioInputDevices(audioApi)
      .then((devices: AudioDevice[]) => {
        if (cancelled) {
          return;
        }
        setInputStatus(resolveDeviceStatus(devices, audioInputDeviceId));
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) {
          setInputStatus({ state: 'unavailable' });
        }
      });

    window.api
      .getAudioOutputDevices(audioApi)
      .then((devices: AudioDevice[]) => {
        if (cancelled) {
          return;
        }
        setHeadsetStatus(resolveDeviceStatus(devices, headsetOutputDeviceId));
        setSpeakerStatus(resolveDeviceStatus(devices, speakerOutputDeviceId));
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) {
          setHeadsetStatus({ state: 'unavailable' });
          setSpeakerStatus({ state: 'unavailable' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    audioConfigLoaded,
    audioApi,
    audioInputDeviceId,
    headsetOutputDeviceId,
    speakerOutputDeviceId
  ]);

  return (
    <div className="d-flex justify-content-center radio-sub-text mt-3">
      <div className="d-flex flex-column gap-1">
        <DeviceLine label="Microphone" status={inputStatus} />
        <DeviceLine label="Headset" status={headsetStatus} />
        <DeviceLine label="Speaker" status={speakerStatus} />
      </div>
    </div>
  );
};

export default AudioHardwareSummary;

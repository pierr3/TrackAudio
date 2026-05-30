import React, { useCallback, useEffect, useState } from 'react';
import { AudioDevice } from 'trackaudio-afv';
import { Configuration } from '../../../../shared/config.type';

// Dispatched on the window whenever the user changes an audio device or API in the
// settings modal, so the pre-connection hardware summary can refresh immediately.
export const AUDIO_CONFIG_CHANGED_EVENT = 'trackaudio-audio-config-changed';

const resolveDeviceName = (devices: AudioDevice[], deviceId: string): string | null => {
  if (!deviceId) {
    return null;
  }
  const match = devices.find((device) => device.id === deviceId);
  return match ? match.name : null;
};

interface DeviceLineProps {
  label: string;
  deviceName: string | null;
}

const DeviceLine: React.FC<DeviceLineProps> = ({ label, deviceName }) => (
  <div className="d-flex justify-content-center gap-2">
    <span className="text-muted">{label}:</span>
    <span className={deviceName ? '' : 'text-danger fw-bold'}>
      {deviceName ?? 'Not configured'}
    </span>
  </div>
);

/**
 * Shows the currently configured audio hardware on the pre-connection screen so the
 * controller can verify their setup before connecting. Devices that are unset or no
 * longer available are highlighted, addressing silent loss of the audio configuration.
 */
const AudioHardwareSummary: React.FC = () => {
  const [inputName, setInputName] = useState<string | null>(null);
  const [headsetName, setHeadsetName] = useState<string | null>(null);
  const [speakerName, setSpeakerName] = useState<string | null>(null);

  const refresh = useCallback(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        if (!config.audioApi && config.audioApi !== 0) {
          return;
        }

        window.api
          .getAudioInputDevices(config.audioApi)
          .then((devices: AudioDevice[]) => {
            setInputName(resolveDeviceName(devices, config.audioInputDeviceId));
          })
          .catch((err: unknown) => {
            console.error(err);
          });

        window.api
          .getAudioOutputDevices(config.audioApi)
          .then((devices: AudioDevice[]) => {
            setHeadsetName(resolveDeviceName(devices, config.headsetOutputDeviceId));
            setSpeakerName(resolveDeviceName(devices, config.speakerOutputDeviceId));
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
    refresh();

    window.addEventListener('focus', refresh);
    window.addEventListener(AUDIO_CONFIG_CHANGED_EVENT, refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(AUDIO_CONFIG_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return (
    <div className="d-flex justify-content-center radio-sub-text mt-3">
      <div className="d-flex flex-column gap-0.5">
        <DeviceLine label="Microphone" deviceName={inputName} />
        <DeviceLine label="Headset" deviceName={headsetName} />
        <DeviceLine label="Speaker" deviceName={speakerName} />
      </div>
    </div>
  );
};

export default AudioHardwareSummary;

import { AudioDevice } from "../../../../backend/js/trackaudio-afv.d";
import React, { useEffect, useState } from "react";

const AudioInput: React.FC = () => {
  const [devices, setDevices] = useState<Array<AudioDevice>>([]);

  useEffect(() => {
    window.api.getAudioInputDevices(-1).then((apis) => {
      setDevices(apis);
    });
  }, []);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // setDevice(devices.find((device) => device.id === e.target.value));
  };

  return (
    <select className="form-control mt-1" onChange={handleDeviceChange}>
      {devices.map(({ id, name, isDefault }) => (
        <option value={id} selected={isDefault}>
          {name}
        </option>
      ))}
    </select>
  );
};

export default AudioInput;

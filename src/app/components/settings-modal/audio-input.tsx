import { AudioDevice } from "../../../../backend/js/trackaudio-afv.d";
import React, { useEffect, useState } from "react";

export type AudioInputProps = {
  devices: Array<AudioDevice>;
  selectedDeviceId: string;
  setDevice: (device: AudioDevice) => void;
};

const AudioInput: React.FC<AudioInputProps> = ({
  devices,
  selectedDeviceId: selectedDeviceId,
  setDevice,
}) => {
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDevice(devices.find((device) => device.id === e.target.value));
  };

  return (
    <select
      className="form-control mt-1"
      onChange={handleDeviceChange}
      value={
        devices.some((device) => device.id === selectedDeviceId)
          ? selectedDeviceId
          : ""
      }
    >
      <option disabled value="">
        {" "}
        -- select an option --{" "}
      </option>
      {devices.map(({ id, name, isDefault }) => (
        <option key={id} value={id}>
          {isDefault ? "* " : ""}
          {name}
        </option>
      ))}
    </select>
  );
};

export default AudioInput;

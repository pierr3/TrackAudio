import { AudioDevice } from "../../../../backend/js/trackaudio-afv.d";
import React from "react";

export type AudioOutputsProps = {
  devices: Array<AudioDevice>;
  setDevice: (device: AudioDevice) => void;
};

const AudioOutputs: React.FC<AudioOutputsProps> = ({ devices, setDevice }) => {

    const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDevice(devices.find((device) => device.id === e.target.value));
    };

    return (
        <select className="form-control mt-1" onChange={handleDeviceChange}>
            {devices.map(({ id, name }) => (
                <option value={id}>{name}</option>
            ))}
        </select>
    );
};

export default AudioOutputs;

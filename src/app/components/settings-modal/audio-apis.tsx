import { AudioApi } from "../../../../backend/js/trackaudio-afv.d";
import React from "react";

export type AudioApisProps = {
  apis: Array<AudioApi>;
};

const AudioApis: React.FC<AudioApisProps> = ({ apis }) => {
    return (
        <select className="form-control mt-1">
            {apis.map(({ id, name }) => (
                <option value={id}>{name}</option>
            ))}
        </select>
    );
};

export default AudioApis;

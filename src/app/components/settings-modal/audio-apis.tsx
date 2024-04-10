import { AudioApi } from "../../../../backend/js/trackaudio-afv.d";
import React from "react";

export type AudioApisProps = {
  apis: Array<AudioApi>;
  selectedApiId: number;
  selectApi: (apiId: number) => void;
};

const AudioApis: React.FC<AudioApisProps> = ({
  apis,
  selectedApiId,
  selectApi,
}) => {
  return (
    <select
      className="form-control mt-1"
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        selectApi(parseInt(e.target.value))
      }
      value={
        apis.some((api) => api.id === selectedApiId)
          ? selectedApiId
          : ""
      }
    >
      <option disabled value=""> -- select an option -- </option>
      {apis.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
};

export default AudioApis;

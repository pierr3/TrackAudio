import { AudioApi } from 'trackaudio-afv';
import React from 'react';

export interface AudioApisProps {
  apis: AudioApi[];
  selectedApiId: number;
  selectApi: (apiId: number) => void;
}

const AudioApis: React.FC<AudioApisProps> = ({ apis, selectedApiId, selectApi }) => {
  let apiValue = -1;

  // Help the user out a bit by defaulting the audio API to the only valid
  // entry if no API was selected and the list of available APIs only
  // has one entry.
  if (apis.some((api) => api.id === selectedApiId)) {
    apiValue = selectedApiId;
  } else if (apis.length === 1) {
    apiValue = apis[0].id;
  }

  return (
    <select
      className="form-control mt-1"
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
        selectApi(parseInt(e.target.value));
      }}
      value={apiValue}
    >
      <option disabled value="">
        {' '}
        -- select an option --{' '}
      </option>
      {apis.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
};

export default AudioApis;

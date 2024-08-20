import React, { useEffect, useState } from 'react';
import { AudioApi } from 'trackaudio-afv';

export interface AudioApisProps {
  apis: AudioApi[];
  selectedApiId: number;
  selectApi: (apiId: number) => void;
}

const AudioApis: React.FC<AudioApisProps> = ({ apis, selectedApiId, selectApi }) => {
  const [apiValue, setApiValue] = useState(-1);

  useEffect(() => {
    // Help the user out a bit by defaulting the audio API to the only valid
    // entry if no API was selected and the list of available APIs only
    // has one entry.
    if (apis.find((api) => api.id === selectedApiId)) {
      setApiValue(selectedApiId);
    } else if (apis.length === 1) {
      setApiValue(apis[0].id);
      selectApi(apis[0].id);
    }
  }, [apis]);

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

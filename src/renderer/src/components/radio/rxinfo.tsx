import useRadioState from '@renderer/store/radioStore';
import { useMemo, useState, useEffect } from 'react';
import type { RadioType } from '@renderer/store/radioStore';
import useUtilStore from '@renderer/store/utilStore';
import clsx from 'clsx';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

const RxInfo = () => {
  const radios = useRadioState((state) => state.radios);
  const [lastActiveRadio, setLastActiveRadio] = useState<RadioType | null>(null);
  const [showExpandedRxInfo, setShowExpandedRxInfo] = useUtilStore((state) => [
    state.showExpandedRxInfo,
    state.setShowExpandedRxInfo
  ]);

  useEffect(() => {
    const currentlyReceiving = radios.find((radio) => radio.rx && radio.currentlyRx);
    if (currentlyReceiving) {
      setLastActiveRadio(currentlyReceiving);
    }
  }, [radios]);

  const displayRadio = useMemo(() => {
    const currentlyReceiving = radios.find((radio) => radio.rx && radio.currentlyRx);
    return currentlyReceiving ?? lastActiveRadio;
  }, [radios, lastActiveRadio]);

  const isCurrentlyReceiving = useMemo(() => {
    return radios.some((radio) => radio.rx && radio.currentlyRx);
  }, [radios]);

  const formatCallsigns = useMemo(() => {
    if (!displayRadio) return '';

    const callsigns = displayRadio.lastReceivedCallsigns;
    if (!callsigns.length) return '';

    const radioPrefix = displayRadio.callsign.slice(0, 4);
    const reorderedCallsigns = [
      ...callsigns.filter((cs) => !cs.startsWith(radioPrefix)),
      ...callsigns.filter((cs) => cs.startsWith(radioPrefix))
    ];

    return reorderedCallsigns.join(', ');
  }, [displayRadio]);

  return (
    <div
      className="d-flex h-100 align-items-center justify-content-end"
      style={{ gap: '15px', width: '200px' }}
    >
      <div className="unicom-bar-container d-flex" style={{ minWidth: '130px', maxWidth: '200px' }}>
        <div className="d-flex justify-content-start">
          <span className="unicom-text">RX:</span>
        </div>
        <div
          className="flex-grow-1 d-flex justify-content-center align-items-end"
          style={{ lineHeight: '29px' }}
        >
          {displayRadio ? (
            <span
              className="rx-text w-100 d-flex justify-content-end"
              style={{ padding: '0 10px' }}
            >
              <div
                className={clsx(
                  'font-weight-bold text-truncate',
                  isCurrentlyReceiving ? 'text-warning' : 'text-grey'
                )}
                style={{ maxWidth: '110px', overflow: 'hidden' }}
                title={formatCallsigns}
              >
                {formatCallsigns || '--------'}
              </div>
            </span>
          ) : (
            <span className="rx-text  d-flex justify-content-end">
              <div className="text-grey">--------</div>
            </span>
          )}
        </div>
      </div>
      <div className="d-flex h-100 align-items-center">
        <button
          className="btn btn-primary hide-settings-flex rx-info-expand"
          onClick={() => {
            setShowExpandedRxInfo(!showExpandedRxInfo);
          }}
        >
          {!showExpandedRxInfo ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
        </button>
      </div>
    </div>
  );
};

export default RxInfo;

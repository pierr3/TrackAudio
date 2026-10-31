import useSessionStore from '@renderer/store/sessionStore';
import useErrorStore from '@renderer/store/errorStore';
import { checkIfCallsignIsRelief, getCleanCallsign } from './CallsignHelper';

const doConnect = () => {
  const { setIsConnecting, setIsConnected } = useSessionStore.getState();

  setIsConnecting(true);
  window.api
    .connect()
    .then((ret) => {
      if (!ret) {
        useErrorStore
          .getState()
          .postError('Error connecting to AFV, check your configuration and credentials.');
        setIsConnecting(false);
        setIsConnected(false);
      }
    })
    .catch((err: unknown) => {
      console.error(err);
    });
};

export const connect = () => {
  const { isConnected, isConnecting, isNetworkConnected, isAtc, callsign, setStationCallsign } =
    useSessionStore.getState();

  if (isConnected || isConnecting || !isNetworkConnected) {
    return;
  }

  if (checkIfCallsignIsRelief(callsign) && isAtc) {
    const reliefCallsign = getCleanCallsign(callsign);
    window.api
      .dialog(
        'question',
        'Relief callsign detected',
        'You might be using a relief callsign, please select which callsign you want to use.',
        [callsign, reliefCallsign]
      )
      .then((ret) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (ret.response === 0) {
          setStationCallsign(callsign);
        } else {
          setStationCallsign(reliefCallsign);
        }
      })
      .then(() => {
        doConnect();
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  } else {
    setStationCallsign(callsign);
    doConnect();
  }
};

import React, { useEffect, useState } from "react";
import "../style/navbar.scss";
import Clock from "./clock";
import SettingsModal from "./settings-modal/settings-modal";
import useErrorStore from "../store/errorStore";
import useSessionStore from "../store/sessionStore";
import clsx from "clsx";
import {
  checkIfCallsignIsRelief,
  getCleanCallsign,
} from "../helpers/CallsignHelper";
import useUtilStore from "../store/utilStore";
import { Configuration } from "../../../../src/main/config";
import MiniModeToggleButton from "./MiniModeToggleButton";

const Navbar: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [platform] = useUtilStore((state) => [state.platform]);

  const postError = useErrorStore((state) => state.postError);
  const [
    isConnected,
    isConnecting,
    setIsConnecting,
    setIsConnected,
    callsign,
    isNetworkConnected,
    radioGain,
    setRadioGain,
    isAtc,
    setStationCallsign,
  ] = useSessionStore((state) => [
    state.isConnected,
    state.isConnecting,
    state.setIsConnecting,
    state.setIsConnected,
    state.callsign,
    state.isNetworkConnected,
    state.radioGain,
    state.setRadioGain,
    state.isAtc,
    state.setStationCallsign,
  ]);

  useEffect(() => {
    window.api
      .getConfig()
      .then((config: Configuration) => {
        const gain = config.radioGain || 0.5;
        const UiGain = gain * 100 || 50;

        window.api
          .SetRadioGain(gain)
          .then(() => {
            setRadioGain(UiGain);
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  }, [setRadioGain]);

  const doConnect = () => {
    setIsConnecting(true);
    window.api
      .connect()
      .then((ret) => {
        if (!ret) {
          postError(
            "Error connecting to AFV, check your configuration and credentials."
          );
          setIsConnecting(false);
          setIsConnected(false);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const handleConnectDisconnect = () => {
    if (isConnected) {
      void window.api.disconnect();
      return;
    }

    if (!isNetworkConnected) {
      return;
    }

    if (checkIfCallsignIsRelief(callsign) && isAtc) {
      const reliefCallsign = getCleanCallsign(callsign);
      window.api
        .dialog(
          "question",
          "Relief callsign detected",
          "You might be using a relief callsign, please select which callsign you want to use.",
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

  const updateRadioGainValue = (newGain: number) => {
    window.api
      .SetRadioGain(newGain / 100)
      .then(() => {
        setRadioGain(newGain);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const handleRadioGainChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateRadioGainValue(event.target.valueAsNumber);
  };

  const handleRadioGainMouseWheel = (
    event: React.WheelEvent<HTMLInputElement>
  ) => {
    const newValue = Math.min(
      Math.max(radioGain + (event.deltaY > 0 ? -1 : 1), 0),
      100
    );

    updateRadioGainValue(newValue);
  };

  return (
    <>
      <div className="d-flex flex-md-row align-items-center p-3 px-md-4 mb-3 custom-navbar hide-topbar">
        <Clock />
        <span
          className={clsx(
            "btn text-box-container m-2",
            isNetworkConnected && !isAtc && "color-warning"
          )}
        >
          {isNetworkConnected ? callsign : "Not Connected"}
        </span>
        <button
          className={clsx(
            "btn m-2 hide-connect-flex",
            !isConnected && "btn-info",
            isConnecting && "loading-button",
            isConnected && "btn-danger"
          )}
          onClick={() => {
            handleConnectDisconnect();
          }}
          disabled={isConnecting || !isNetworkConnected}
        >
          {isConnected
            ? "Disconnect"
            : isConnecting
              ? "Connecting..."
              : "Connect"}
        </button>
        <button
          className="btn btn-info m-2 hide-settings-flex"
          disabled={isConnected || isConnecting}
          onClick={() => {
            setShowModal(true);
          }}
        >
          Settings
        </button>

        <span
          className="btn text-box-container m-2 hide-gain-value"
          style={{ width: "88px" }}
          onWheel={handleRadioGainMouseWheel}
        >
          Gain: {radioGain.toFixed(0).padStart(3, "0")}%
        </span>
        <input
          type="range"
          className="form-range m-2 gain-slider"
          min="0"
          max="100"
          step="1"
          onChange={handleRadioGainChange}
          onWheel={handleRadioGainMouseWheel}
          value={radioGain}
        ></input>
        <MiniModeToggleButton showRestoreButton={false} />
        {platform === "linux" && (
          <button
            className="btn btn-danger m-2 hide-gain-value"
            onClick={() => void window.api.CloseMe()}
          >
            X
          </button>
        )}
      </div>
      {showModal && (
        <SettingsModal
          closeModal={() => {
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;

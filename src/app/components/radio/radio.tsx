import React from "react";
import useRadioState, { RadioType, RadioHelper } from "../../store/radioStore";
import clsx from "clsx";
import useErrorStore from "../../store/errorStore";
import useSessionStore from "../../store/sessionStore";

export type RadioProps = {
  radio: RadioType;
};

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const [setRx, setTx, setXc, setOnSpeaker, selectRadio, removeRadio] =
    useRadioState((state) => [
      state.setRx,
      state.setTx,
      state.setXc,
      state.setOnSpeaker,
      state.selectRadio,
      state.removeRadio,
    ]);

  const isATC = useSessionStore((state) => state.isAtc);

  const clickRx = () => {
    const newState = !radio.rx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState,
        radio.tx,
        radio.xc,
        radio.onSpeaker
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: RX.");
          removeRadio(radio.frequency);
          return;
        }
        setRx(radio.frequency, newState);
      });
  };

  const clickTx = () => {
    const newState = !radio.tx;

    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        newState,
        radio.xc,
        radio.onSpeaker
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: TX.");
          return;
        }
        setTx(radio.frequency, newState);
      });
  };

  const clickXc = () => {
    const newState = !radio.xc;
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        newState,
        radio.onSpeaker
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: XC.");
          return;
        }
        setXc(radio.frequency, newState);
      });
  };

  const clickSpK = () => {
    const newState = !radio.onSpeaker;
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        radio.xc,
        newState
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: OnSPK.");
          removeRadio(radio.frequency);
          return;
        }
        setOnSpeaker(radio.frequency, newState);
      });
  };

  return (
    <>
      <div className="col-4 radio">
        <div style={{ width: "48%", height: "45%", float: "left" }}>
          <button
            className="btn btn-no-interact"
            style={{ height: "100%", marginBottom: "4%" }}
            onClick={() => selectRadio(radio.frequency)}
          >
            {RadioHelper.convertHzToMhzString(radio.frequency)}
            <br />
            {radio.callsign}
          </button>
          <button
            className={clsx(
              "btn",
              !radio.xc && "btn-primary",
              radio.xc && "btn-success"
            )}
            style={{ width: "45%", height: "100%", marginTop: "4%" }}
            onClick={clickXc}
            disabled={!isATC}
          >
            XC
          </button>
          <button
            className={clsx(
              "btn",
              !radio.onSpeaker && "btn-primary",
              radio.onSpeaker && "btn-success"
            )}
            style={{
              width: "45%",
              height: "100%",
              marginTop: "4%",
              marginLeft: "10%",
            }}
            onClick={clickSpK}
          >
            SPK
          </button>
        </div>
        <div
          style={{
            width: "48%",
            height: "45%",
            float: "right",
            marginLeft: "4%",
          }}
        >
          <button
            className={clsx(
              "btn",
              !radio.rx && "btn-primary",
              radio.rx && radio.currentlyRx && "btn-warning",
              radio.rx && !radio.currentlyRx && "btn-success"
            )}
            style={{ width: "100%", height: "100%" }}
            onClick={clickRx}
          >
            RX
          </button>
          <button
            className={clsx(
              "btn",
              !radio.tx && "btn-primary",
              radio.tx && radio.currentlyTx && "btn-warning",
              radio.tx && !radio.currentlyTx && "btn-success"
            )}
            style={{ width: "100%", height: "100%", marginTop: "8%" }}
            onClick={clickTx}
            disabled={!isATC}
          >
            TX
          </button>
        </div>
      </div>
    </>
  );
};

export default Radio;

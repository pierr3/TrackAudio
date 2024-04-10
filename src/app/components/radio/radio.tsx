import React from "react";
import useRadioState, { RadioType, RadioHelper } from "../../store/radioStore";
import clsx from "clsx";
import useErrorStore from "../../store/errorStore";

export type RadioProps = {
  radio: RadioType;
};

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const { setRx, setTx, setXc, setOnSpeaker, selectRadio, removeRadio } =
    useRadioState();

  const clickRx = () => {
    window.api
      .setFrequencyState(
        radio.frequency,
        !radio.rx,
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
        setRx(radio.frequency, !radio.rx);
      });
  };

  const clickTx = () => {
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        !radio.tx,
        radio.xc,
        radio.onSpeaker
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: TX.");
          //removeRadio(radio.frequency);
          return;
        }
        setTx(radio.frequency, !radio.tx);
      });
  };

  const clickXc = () => {
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        !radio.xc,
        radio.onSpeaker
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: XC.");
          //removeRadio(radio.frequency);
          return;
        }
        setXc(radio.frequency, !radio.xc);
      });
  };

  const clickSpK = () => {
    window.api
      .setFrequencyState(
        radio.frequency,
        radio.rx,
        radio.tx,
        radio.xc,
        !radio.onSpeaker
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: OnSPK.");
          removeRadio(radio.frequency);
          return;
        }
        setOnSpeaker(radio.frequency, !radio.onSpeaker);
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
          >
            TX
          </button>
        </div>
      </div>
    </>
  );
};

export default Radio;

import React from "react";
import useRadioState, { RadioType, RadioHelper } from "../../store/radioStore";
import clsx from "clsx";
import useErrorStore from "../../store/errorStore";
import useSessionStore from "../../store/sessionStore";

export interface RadioProps {
  radio: RadioType;
}

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const [
    setRx,
    setTx,
    setXc,
    setCrossCoupleAcross,
    setOnSpeaker,
    selectRadio,
    removeRadio,
  ] = useRadioState((state) => [
    state.setRx,
    state.setTx,
    state.setXc,
    state.setCrossCoupleAcross,
    state.setOnSpeaker,
    state.selectRadio,
    state.removeRadio,
  ]);

  const isATC = useSessionStore((state) => state.isAtc);

  const clickRadioHeader = () => {
    selectRadio(radio.frequency);
    if (radio.transceiverCount === 0 && radio.callsign !== "MANUAL") {
      void window.api.RefreshStation(radio.callsign);
    }
  };

  const clickRx = () => {
    const newState = !radio.rx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState,
        newState ? radio.tx : false,
        newState ? radio.xc : false,
        radio.onSpeaker,
        newState ? radio.crossCoupleAcross : false,
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: RX.");
          removeRadio(radio.frequency);
          return;
        }
        setRx(radio.frequency, newState);
        setTx(radio.frequency, newState ? radio.tx : false);
        setXc(radio.frequency, newState ? radio.xc : false);
        setCrossCoupleAcross(
          radio.frequency,
          newState ? radio.crossCoupleAcross : false,
        );
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const clickTx = () => {
    const newState = !radio.tx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If tx is true, rx must be true
        newState,
        !newState ? false : radio.xc, // If tx is false, xc must be false
        radio.onSpeaker,
        !newState ? false : radio.crossCoupleAcross, // If tx is false, crossCoupleAcross must be false
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: TX.");
          return;
        }
        setTx(radio.frequency, newState);
        setRx(radio.frequency, newState ? true : radio.rx);
        setXc(radio.frequency, !newState ? false : radio.xc);
        setCrossCoupleAcross(
          radio.frequency,
          !newState ? false : radio.crossCoupleAcross,
        );
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const clickXc = () => {
    const newState = !radio.xc;
    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If xc is true, rx must be true
        newState ? true : radio.tx, // If xc is true, tx must be true
        newState,
        radio.onSpeaker,
        false, // If xc is true, crossCoupleAcross must be false
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: XC.");
          return;
        }
        setRx(radio.frequency, newState ? true : radio.rx);
        setTx(radio.frequency, newState ? true : radio.tx);
        setXc(radio.frequency, newState);
        setCrossCoupleAcross(radio.frequency, false);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const clickCrossCoupleAcross = () => {
    const newState = !radio.crossCoupleAcross;
    window.api
      .setFrequencyState(
        radio.frequency,
        newState ? true : radio.rx, // If crossCoupleAcross is true, rx must be true
        newState ? true : radio.tx, // If crossCoupleAcross is true, tx must be true
        false, // If crossCoupleAcross is true, xc must be false
        radio.onSpeaker,
        newState,
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: XC across.");
          return;
        }
        setRx(radio.frequency, newState ? true : radio.rx);
        setTx(radio.frequency, newState ? true : radio.tx);
        setXc(radio.frequency, false);
        setCrossCoupleAcross(radio.frequency, newState);
      })
      .catch((err: unknown) => {
        console.error(err);
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
        newState,
        radio.crossCoupleAcross,
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: OnSPK.");
          removeRadio(radio.frequency);
          return;
        }
        setOnSpeaker(radio.frequency, newState);
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  return (
    <>
      <div className="col-4 radio">
        <div style={{ width: "48%", height: "45%", float: "left" }}>
          <button
            className="btn btn-no-interact"
            style={{ height: "100%", marginBottom: "4%" }}
            onClick={clickRadioHeader}
          >
            {RadioHelper.convertHzToMhzString(radio.frequency)}
            <br />
            {radio.callsign}
          </button>
          <button
            className={clsx(
              "btn",
              !radio.xc && !radio.crossCoupleAcross && "btn-primary",
              radio.xc && "btn-success",
              radio.crossCoupleAcross && "btn-warning",
            )}
            style={{ width: "45%", height: "100%", marginTop: "4%" }}
            onClick={clickXc}
            onContextMenu={clickCrossCoupleAcross}
            disabled={!isATC}
          >
            {radio.crossCoupleAcross ? "XCA" : "XC"}
          </button>
          <button
            className={clsx(
              "btn",
              !radio.onSpeaker && "btn-primary",
              radio.onSpeaker && "btn-success",
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
              radio.rx && !radio.currentlyRx && "btn-success",
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
              radio.tx && !radio.currentlyTx && "btn-success",
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

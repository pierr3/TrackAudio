import React from "react";
import useRadioState, { RadioType } from "../../store/radioStore";
import clsx from "clsx";
import useErrorStore from "../../store/errorStore";
import useSessionStore from "../../store/sessionStore";

export interface RadioProps {
  radio: RadioType;
}

const Radio: React.FC<RadioProps> = ({ radio }) => {
  const postError = useErrorStore((state) => state.postError);
  const [
    setRadioState,
    selectRadio,
    removeRadio,
    setPendingDeletion,
  ] = useRadioState((state) => [
    state.setRadioState,
    state.selectRadio,
    state.removeRadio,
    state.setPendingDeletion,
  ]);

  const isATC = useSessionStore((state) => state.isAtc);

  const clickRadioHeader = () => {
    selectRadio(radio.frequency);
    if (radio.transceiverCount === 0 && radio.callsign !== "MANUAL") {
      void window.api.RefreshStation(radio.callsign);
    }
  };

  const clickRx = () => {
    clickRadioHeader();
    const newState = !radio.rx;

    window.api
      .setFrequencyState(
        radio.frequency,
        newState,
        newState ? radio.tx : false,
        newState ? radio.xc : false,
        radio.onSpeaker,
        newState ? radio.crossCoupleAcross : false
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: RX.");
          removeRadio(radio.frequency);
          return;
        }
        setRadioState(radio.frequency, {
          rx: newState,
          tx: !newState ? false : radio.tx,
          xc: !newState ? false : radio.xc,
          crossCoupleAcross: !newState ? false : radio.crossCoupleAcross,
          onSpeaker: radio.onSpeaker,
        });
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
        !newState ? false : radio.crossCoupleAcross // If tx is false, crossCoupleAcross must be false
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: TX.");
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: newState,
          xc: !newState ? false : radio.xc,
          crossCoupleAcross: !newState ? false : radio.crossCoupleAcross,
          onSpeaker: radio.onSpeaker,
        });
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
        false // If xc is true, crossCoupleAcross must be false
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: XC.");
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: !radio.tx && newState ? true : radio.tx,
          xc: newState,
          crossCoupleAcross: false,
          onSpeaker: radio.onSpeaker,
        });
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
        newState
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: XC across.");
          return;
        }
        setRadioState(radio.frequency, {
          rx: !radio.rx && newState ? true : radio.rx,
          tx: !radio.tx && newState ? true : radio.tx,
          xc: false,
          crossCoupleAcross: newState,
          onSpeaker: radio.onSpeaker,
        });
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
        radio.crossCoupleAcross
      )
      .then((ret) => {
        if (!ret) {
          postError("Invalid action on invalid radio: OnSPK.");
          removeRadio(radio.frequency);
          return;
        }
        setRadioState(radio.frequency, {
          rx: radio.rx,
          tx: radio.tx,
          xc: radio.xc,
          crossCoupleAcross: radio.crossCoupleAcross,
          onSpeaker: newState,
        });
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const awaitEndOfRxForDeletion = (frequency: number): void => {
    const interval = setInterval(
      (frequency: number) => {
        const radio = useRadioState
          .getState()
          .radios.find((r) => r.frequency === frequency);
        if (!radio) {
          clearInterval(interval);
          return;
        }

        if (!radio.currentlyRx && !radio.currentlyTx) {
          void window.api.removeFrequency(radio.frequency);
          removeRadio(radio.frequency);
          clearInterval(interval);
        }
      },
      60,
      frequency
    );

    // Clear the interval after 5 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);
  };

  return (
    <>
      <div className="col-4 radio">
        <div style={{ width: "48%", height: "45%", float: "left" }}>
          <button
            className="btn btn-no-interact"
            style={{ height: "100%", marginBottom: "4%" }}
            onClick={clickRadioHeader}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                awaitEndOfRxForDeletion(radio.frequency);
                setPendingDeletion(radio.frequency, true);
              }
            }}
          >
            {radio.humanFrequency}
            <br />
            {radio.callsign}
          </button>
          <button
            className={clsx(
              "btn",
              !radio.xc && !radio.crossCoupleAcross && "btn-primary",
              radio.xc && "btn-success",
              radio.crossCoupleAcross && "btn-warning"
            )}
            style={{ width: "45%", height: "100%", marginTop: "4%" }}
            onClick={clickCrossCoupleAcross}
            onContextMenu={clickXc}
            disabled={!isATC}
          >
            {radio.xc ? "XC" : "XCA"}
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

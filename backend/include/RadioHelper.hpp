#pragma once

#include "Helpers.hpp"
#include "Shared.hpp"
#include "sdk.hpp"
#include <optional>

class RadioState {
public:
    int frequency;
    bool headset;
    bool rx;
    bool tx;
    bool xc;
    bool xca;
};

class RadioHelper {
public:
    /**
     * @brief Set the state of a radio.
     *
     * @param newState The state to set
     * @return true The state was set successfully
     * @return false The state was not set successfully
     */
    static bool SetRadioState(const std::shared_ptr<SDK>& mApiServer, const RadioState& newState,
        const std::string& stationCallsign = "")
    {
        if (!mClient->IsVoiceConnected()) {
            TRACK_LOG_TRACE("Voice is not connected, not setting radio state");
            return false;
        }

        if (!mClient->IsFrequencyActive(newState.frequency)) {
            TRACK_LOG_TRACE("Frequency is not active, not setting radio state");
            return false;
        }

        TRACK_LOG_TRACE(
            "Setting radio state for frequency={}: rx={}, tx={}, xc={}, xca={}, headset = {} ",
            newState.frequency, newState.rx, newState.tx, newState.xc, newState.xca,
            newState.headset);

        bool oldRxValue = mClient->GetRxState(newState.frequency);
        mClient->SetRx(newState.frequency, newState.rx);
        mClient->SetRadioGainAll(UserSession::currentRadioGain);

        if (UserSession::xy) {
            mClient->SetTx(newState.frequency, newState.tx);
            mClient->SetXc(newState.frequency, newState.xc);
            mClient->SetCrossCoupleAcross(newState.frequency, newState.xca);
        } else {
            mClient->SetTx(newState.frequency, false);
            mClient->SetXc(newState.frequency, false);
            mClient->SetCrossCoupleAcross(newState.frequency, false);
        }

        mClient->SetOnHeadset(newState.frequency, newState.headset);


        if (!oldRxValue && newState.rx) {
            // When turning on RX, we refresh the transceivers
            auto states = mClient->getRadioState();
            if (states.find(newState.frequency) != states.end()
                && !states[newState.frequency].stationName.empty()) {
                mClient->FetchTransceiverInfo(states[newState.frequency].stationName);
            }
        }

        // Included for legacy reasons in case some older client depends on this message.
        mApiServer->handleAFVEventForWebsocket(
            sdk::types::Event::kFrequencyStateUpdate, std::nullopt, std::nullopt);

        // New event that only notifies of the change to this specific station.
        std::optional<std::string> optionalCallsign
            = stationCallsign.empty() ? std::nullopt : std::optional<std::string>(stationCallsign);
        auto stateJson = mApiServer->buildStationStateJson(optionalCallsign, newState.frequency);
        mApiServer->publishStationState(stateJson);
        NapiHelpers::callElectron("station-state-update", stateJson.dump());

        return true;
    }
};
;

#pragma once

#include "Helpers.hpp"
#include "Shared.hpp"
#include "sdk.hpp"
#include <optional>
#include <plog/Log.h>

class RadioState {
public:
    int frequency;
    bool headset;
    bool rx;
    bool tx;
    bool xc;
    bool xca;
    bool isOutputMuted;
    float outputVolume;
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
        const std::string& stationCallsign = "", const bool sendToElectron = true)
    {
        if (!mClient || !mClient->IsVoiceConnected()) {
            PLOGV << "Voice is not connected, not setting radio state";
            return false;
        }

        if (!mClient->IsFrequencyActive(newState.frequency)) {
            PLOG_VERBOSE << "Frequency is not active, not setting radio state";
            return false;
        }

        PLOGV << "Setting radio state for frequency=" << newState.frequency
              << ": rx=" << newState.rx << ", tx=" << newState.tx << ", xc=" << newState.xc
              << ", xca=" << newState.xca << ", headset = " << newState.headset;

        bool oldRxValue = mClient->GetRxState(newState.frequency);
        mClient->SetRx(newState.frequency, newState.rx);

        setRadioVolume(newState.frequency, newState.outputVolume);

        bool isXy = false;
        {
            std::lock_guard<std::mutex> sessionLock(UserSession::mtx);
            isXy = UserSession::xy;
        }
        if (isXy) {
            mClient->SetTx(newState.frequency, newState.tx);
            mClient->SetXc(newState.frequency, newState.xc);
            mClient->SetCrossCoupleAcross(newState.frequency, newState.xca);
        } else {
            mClient->SetTx(newState.frequency, false);
            mClient->SetXc(newState.frequency, false);
            mClient->SetCrossCoupleAcross(newState.frequency, false);
        }

        mClient->SetOutputMute(newState.frequency, newState.isOutputMuted);

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
        mApiServer->publishStationState(stateJson, sendToElectron);

        return true;
    }

    static void setAllRadioVolumes()
    {
        if (!mClient) {
            return;
        }
        auto states = mClient->getRadioState();
        for (const auto& state : states) {
            setRadioVolume(state.first);
        }
    }

    static void setRadioVolume(
        const unsigned int frequency, const std::optional<float> volume = std::nullopt)
    {
        float stationVolume = 100;
        float mainVolume = 100;

        {
            std::lock_guard<std::mutex> sessionLock(UserSession::mtx);
            if (volume.has_value()) {
                stationVolume = volume.value();
                UserSession::stationVolumes.insert_or_assign(frequency, stationVolume);
            } else {
                auto stationVolumeIterator = UserSession::stationVolumes.find(frequency);
                if (stationVolumeIterator != UserSession::stationVolumes.end()) {
                    stationVolume = stationVolumeIterator->second;
                }
            }
            mainVolume = UserSession::currentMainVolume;
        }

        float combinedVolume = (mainVolume / 100.0f) * (stationVolume / 100.0f) * 100.0f;

        // Clamp it to ensure it stays within 0-100
        combinedVolume = std::min(100.0f, std::max(0.0f, combinedVolume));

        // Now convert the 0-100 volume to gain
        float gain = Helpers::ConvertVolumeToGain(combinedVolume);

        mClient->SetRadioGain(frequency, gain);
    }

    static double getRadioVolume(const unsigned int frequency)
    {
        std::lock_guard<std::mutex> sessionLock(UserSession::mtx);
        auto stationVolumeIterator = UserSession::stationVolumes.find(frequency);
        if (stationVolumeIterator != UserSession::stationVolumes.end()) {
            return stationVolumeIterator->second;
        }
        return 100;
    }
};
;

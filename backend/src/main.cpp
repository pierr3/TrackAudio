#include "LogFactory.h"
#include "afv-native/afv/dto/StationTransceiver.h"
#include "afv-native/atcClientWrapper.h"
#include "afv-native/event.h"
#include "afv-native/hardwareType.h"
#include <absl/strings/ascii.h>
#include <absl/strings/match.h>
#include <atomic>
#include <cctype>
#include <chrono>
#include <cstddef>
#include <httplib.h>
#include <memory>
#include <napi.h>
#include <optional>
#include <plog/Log.h>
#include <sago/platform_folders.h>
#include <semver.hpp>
#include <string>
#include <thread>

#include "Helpers.hpp"
#include "InputHandler.hpp"
#include "RadioHelper.hpp"
#include "RemoteData.hpp"
#include "Shared.hpp"
#include "sdk.hpp"

struct MainThreadShared {
public:
    inline static std::unique_ptr<RemoteData> mRemoteDataHandler = nullptr;
    inline static std::shared_ptr<SDK> mApiServer = nullptr;

    inline static bool ShouldRun = true;

    inline static std::unique_ptr<std::thread> vuMeterThread = nullptr;
    inline static std::atomic_bool runVuMeterCallback = false;

    inline static std::unique_ptr<InputHandler> inputHandler = nullptr;
};
namespace {
Napi::Array GetAudioApis(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    Napi::Array arr = Napi::Array::New(env);

    for (const auto& [apiId, apiName] : mClient->GetAudioApis()) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("id", apiId);
        obj.Set("name", apiName);
        arr.Set(arr.Length(), obj);
    }

    return arr;
}

Napi::Array GetAudioInputDevices(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    int apiId = info[0].As<Napi::Number>().Int32Value();
    Napi::Array arr = Napi::Array::New(env);

    for (const auto& [deviceId, deviceName, isDefault] : mClient->GetAudioInputDevices(apiId)) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("id", deviceId);
        obj.Set("name", deviceName);
        obj.Set("isDefault", isDefault);
        arr.Set(arr.Length(), obj);
    }

    return arr;
}

Napi::Array GetAudioOutputDevices(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    int apiId = info[0].As<Napi::Number>().Int32Value();
    Napi::Array arr = Napi::Array::New(env);

    for (const auto& [deviceId, deviceName, isDefault] : mClient->GetAudioOutputDevices(apiId)) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("id", deviceId);
        obj.Set("name", deviceName);
        obj.Set("isDefault", isDefault);
        arr.Set(arr.Length(), obj);
    }

    return arr;
}

Napi::Boolean Connect(const Napi::CallbackInfo& info)
{
    if (!MainThreadShared::ShouldRun) {
        return Napi::Boolean::New(info.Env(), false);
    }

    Napi::Env env = info.Env();

    if (!UserSession::isConnectedToTheNetwork) {
        return Napi::Boolean::New(env, false);
    }

    if (mClient->IsVoiceConnected()) {
        return Napi::Boolean::New(info.Env(), false);
    }

    if (!UserAudioSetting::CheckAudioSettings()) {
        NapiHelpers::sendErrorToElectron(
            "Audio settings not set, please set all your audio devices correctly (Speakers, "
            "Microphone, Headset and API)");
        return Napi::Boolean::New(env, false);
    }

    auto password = info[0].As<Napi::String>().Utf8Value();

    mClient->SetCallsign(UserSession::callsign);
    mClient->SetCredentials(UserSession::cid, password);
    mClient->SetClientPosition(UserSession::lat, UserSession::lon, 150, 150);
    return Napi::Boolean::New(env, mClient->Connect());
}

void Disconnect(const Napi::CallbackInfo& /*info*/)
{
    if (!mClient->IsVoiceConnected()) {
        return;
    }
    mClient->Disconnect();
    MainThreadShared::mApiServer->handleAFVEventForWebsocket(
        sdk::types::Event::kDisconnectFrequencyStateUpdate, {}, {});
}

void SetGuardAndUnicomTransceivers()
{
    const auto transceivers = mClient->GetTransceivers();
    const auto states = mClient->getRadioState();

    std::vector<afv_native::afv::dto::StationTransceiver> guardAndUnicomTransceivers;
    for (const auto& [frequency, state] : states) {
        if (frequency == UNICOM_FREQUENCY || frequency == GUARD_FREQUENCY || !state.rx) {
            continue;
        }

        if (transceivers.find(state.stationName) != transceivers.end()) {
            for (const auto& transceiver : transceivers.at(state.stationName)) {
                guardAndUnicomTransceivers.push_back(transceiver);
            }
        }
    }

    mClient->SetManualTransceivers(UNICOM_FREQUENCY, guardAndUnicomTransceivers);
    mClient->SetManualTransceivers(GUARD_FREQUENCY, guardAndUnicomTransceivers);

    PLOGV << "SetGuardAndUnicomTransceivers: " << guardAndUnicomTransceivers.size();
}

void SetAudioSettings(const Napi::CallbackInfo& info)
{
    if (mClient->IsVoiceConnected()) {
        return; // Don't allow changing audio settings while connected
    }
    int apiId = info[0].As<Napi::Number>().Int32Value();
    auto inputDeviceId = info[1].As<Napi::String>().Utf8Value();
    auto headsetOutputDeviceId = info[2].As<Napi::String>().Utf8Value();
    auto speakersOutputDeviceId = info[3].As<Napi::String>().Utf8Value();

    UserAudioSetting::apiId = apiId;
    UserAudioSetting::inputDeviceId = inputDeviceId;
    UserAudioSetting::headsetOutputDeviceId = headsetOutputDeviceId;
    UserAudioSetting::speakersOutputDeviceId = speakersOutputDeviceId;

    mClient->SetAudioApi(apiId);
    mClient->SetAudioInputDevice(inputDeviceId);
    mClient->SetAudioOutputDevice(headsetOutputDeviceId);
    mClient->SetAudioSpeakersOutputDevice(speakersOutputDeviceId);
}

Napi::Boolean AddFrequency(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return Napi::Boolean::New(info.Env(), false);
    }

    int frequency = info[0].As<Napi::Number>().Int32Value();
    auto callsign = info[1].As<Napi::String>().Utf8Value();
    auto hasBeenAddded = mClient->AddFrequency(frequency, callsign);
    if (!hasBeenAddded) {
        NapiHelpers::sendErrorToElectron("Could not add frequency: it already exists");
        PLOGW << "Could not add frequency, it already exists: " << frequency << " " << callsign;
        return Napi::Boolean::New(info.Env(), false);
    }

    RadioState newState {};

    newState.frequency = frequency;
    newState.rx = false;
    newState.tx = false;
    newState.xc = false;
    newState.headset = true;
    newState.xca = false;

    // Issue 227: Make sure to publish the frequency was added to any connected clients.
    MainThreadShared::mApiServer->publishStationAdded(callsign, frequency);

    auto result = RadioHelper::SetRadioState(MainThreadShared::mApiServer, newState, callsign);
    return Napi::Boolean::New(info.Env(), result);
}

void RemoveFrequency(const Napi::CallbackInfo& info)
{
    RadioState newState {};

    newState.frequency = info[0].As<Napi::Number>().Int32Value();
    newState.rx = false;
    newState.tx = false;
    newState.xc = false;
    newState.headset = false;
    newState.xca = false;

    RadioHelper::SetRadioState(MainThreadShared::mApiServer, newState);
    mClient->RemoveFrequency(newState.frequency);

    MainThreadShared::mApiServer->publishFrequencyRemoved(newState.frequency);
}

void Reset(const Napi::CallbackInfo& /*info*/) { mClient->reset(); }

Napi::Boolean SetFrequencyState(const Napi::CallbackInfo& info)
{
    RadioState newState {};

    newState.frequency = info[0].As<Napi::Number>().Int32Value();
    newState.rx = info[1].As<Napi::Boolean>().Value();
    newState.tx = info[2].As<Napi::Boolean>().Value();
    newState.xc = info[3].As<Napi::Boolean>().Value();
    // Note the negation here, as the API uses the opposite of what is saved internally
    newState.headset = !info[4].As<Napi::Boolean>().Value();
    newState.xca = info[5].As<Napi::Boolean>().Value(); // Not used

    // SetGuardAndUnicomTransceivers();

    auto result = RadioHelper::SetRadioState(MainThreadShared::mApiServer, newState);
    return Napi::Boolean::New(info.Env(), result);
}

Napi::Object GetFrequencyState(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    int frequency = info[0].As<Napi::Number>().Int32Value();
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("rx", mClient->GetRxState(frequency));
    obj.Set("tx", mClient->GetTxState(frequency));
    obj.Set("xc", mClient->GetXcState(frequency));
    obj.Set("onSpeaker", !mClient->GetOnHeadset(frequency));
    obj.Set("crossCoupleAcross", !mClient->GetCrossCoupleAcrossState(frequency));

    return obj;
}

void RegisterCallback(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    auto callbackFunction = info[0].As<Napi::Function>();

    // Create a ThreadSafeFunction
    NapiHelpers::setCallbackRef(
        Napi::ThreadSafeFunction::New(env, callbackFunction, "trackaudio-afv-res", 0, 3));
}

void GetStation(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return;
    }

    auto callsign = info[0].As<Napi::String>().Utf8Value();
    mClient->GetStation(callsign);
    mClient->FetchStationVccs(callsign);
}

void RefreshStation(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return;
    }
    auto callsign = info[0].As<Napi::String>().Utf8Value();
    mClient->FetchTransceiverInfo(callsign);
}

Napi::Boolean IsFrequencyActive(const Napi::CallbackInfo& info)
{
    int frequency = info[0].As<Napi::Number>().Int32Value();
    return Napi::Boolean::New(info.Env(), mClient->IsFrequencyActive(frequency));
}

void SetCid(const Napi::CallbackInfo& info)
{
    auto cid = info[0].As<Napi::String>().Utf8Value();
    UserSession::cid = cid;
}

void SetRadioEffects(const Napi::CallbackInfo& info)
{
    auto radioEffects = info[0].As<Napi::String>().Utf8Value();
    radioEffects = absl::AsciiStrToLower(radioEffects);
    bool enableInputFilters = false;
    bool enableOutputEffects = false;

    if (radioEffects == "on") {
        enableInputFilters = true;
        enableOutputEffects = true;
    } else if (radioEffects == "input") {
        enableInputFilters = true;
        enableOutputEffects = false;
    } else if (radioEffects == "output") {
        enableInputFilters = false;
        enableOutputEffects = true;
    } else if (radioEffects == "off") {
        enableInputFilters = false;
        enableOutputEffects = false;
    } else {
        PLOGW << "Invalid radioEffects value: " << radioEffects;
        return;
    }
    mClient->SetEnableInputFilters(enableInputFilters);
    mClient->SetEnableOutputEffects(enableOutputEffects);
}

void SetHardwareType(const Napi::CallbackInfo& info)
{
    auto hardwareTypeIndex = info[0].As<Napi::Number>().Int32Value();
    auto hardware = afv_native::HardwareType::Schmid_ED_137B;

    if (hardwareTypeIndex == 1) {
        hardware = afv_native::HardwareType::Rockwell_Collins_2100;
    }

    if (hardwareTypeIndex == 2) {
        hardware = afv_native::HardwareType::Garex_220;
    }

    mClient->SetHardware(hardware);
}

void SetPtt(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return;
    }

    if (!UserSession::xy) {
        mClient->SetPtt(false);
        return;
    }

    bool state = info[0].As<Napi::Boolean>().Value();

    mClient->SetPtt(state);
}

void SetRadioGain(const Napi::CallbackInfo& info)
{
    float gain = info[0].As<Napi::Number>().FloatValue();
    UserSession::currentRadioGain = gain;

    auto states = mClient->getRadioState();
    for (const auto& state : states) {
        if (state.second.Frequency == UNICOM_FREQUENCY
            || state.second.Frequency == GUARD_FREQUENCY) {
            continue;
        }
        mClient->SetRadioGain(state.first, gain);
    }
}

void SetFrequencyRadioGain(const Napi::CallbackInfo& info)
{
    int frequency = info[0].As<Napi::Number>().Int32Value();
    float gain = info[1].As<Napi::Number>().FloatValue();

    mClient->SetRadioGain(frequency, gain);
}

Napi::String Version(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    return Napi::String::New(env, VERSION.to_string());
}

Napi::Boolean IsConnected(const Napi::CallbackInfo& info)
{
    return Napi::Boolean::New(info.Env(), mClient->IsVoiceConnected());
}

void StartMicTest(const Napi::CallbackInfo& /*info*/)
{
    if (!mClient || !NapiHelpers::callbackAvailable || MainThreadShared::vuMeterThread != nullptr) {
        PLOGW << "Attempted to start mic test without callback or "
                 "uninitiated client, or already running mic test, this "
                 "will be useless";
        return;
    }

    mClient->StartAudio();
    MainThreadShared::runVuMeterCallback = true;

    MainThreadShared::vuMeterThread = std::make_unique<std::thread>([] {
        for (int i = 0; i < 2400; i++) { // Max of 2 minutes, don't allow infinite test
#ifndef WIN32
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
#else
            Sleep(50); // std::this_thread::sleep_for is boinked on windows
#endif
            if (!mClient->IsAudioRunning()) {
                break;
            }

            if (!MainThreadShared::runVuMeterCallback) {
                break;
            }

            auto vuMeter = mClient->GetInputVu();
            auto vuMeterPeak = mClient->GetInputPeak();

            NapiHelpers::callElectron(
                "VuMeter", std::to_string(vuMeter), std::to_string(vuMeterPeak));
        }
    });
}

void StopMicTest(const Napi::CallbackInfo& /*info*/)
{
    if (!mClient) {
        return;
    }

    MainThreadShared::runVuMeterCallback = false;
    if (MainThreadShared::vuMeterThread && MainThreadShared::vuMeterThread->joinable()) {
        MainThreadShared::vuMeterThread->join();
    }
    MainThreadShared::vuMeterThread.reset(nullptr);

    mClient->StopAudio();
}

void StartAudio(const Napi::CallbackInfo& /*info*/)
{
    if (!mClient || mClient->IsAudioRunning()) {
        PLOGW << "Attempted to start audio when audio already running";
        return;
    }

    mClient->StartAudio();
}

void StopAudio(const Napi::CallbackInfo& /*info*/)
{
    if (!mClient || !mClient->IsAudioRunning()) {
        PLOGW << "Attempted to stop audio when audio not running";
        return;
    }

    mClient->StopAudio();
}

void SetupPttBegin(const Napi::CallbackInfo& info)
{
    int pttIndex = info[0].As<Napi::Number>().Int32Value();
    bool shouldListenForJoysticks = true;

    if (info.Length() > 1 && info[1].IsBoolean()) {
        shouldListenForJoysticks = info[1].As<Napi::Boolean>().Value();
    }

    MainThreadShared::inputHandler->startPttSetup(pttIndex, shouldListenForJoysticks);
}

void ClearPtt(const Napi::CallbackInfo& info)
{
    int pttIndex = info[0].As<Napi::Number>().Int32Value();

    MainThreadShared::inputHandler->clearPtt(pttIndex);
}

void SetupPttEnd(const Napi::CallbackInfo& /*info*/)
{
    MainThreadShared::inputHandler->stopPttSetup();
}

void RequestPttKeyName(const Napi::CallbackInfo& info)
{
    int pttIndex = info[0].As<Napi::Number>().Int32Value();
    InputHandler::forwardPttKeyName(pttIndex);
}

// NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,readability-function-cognitive-complexity)
void HandleAfvEvents(afv_native::ClientEventType eventType, std::optional<std::string> string1,
    std::optional<int> int1, std::optional<std::pair<std::string, unsigned int>> stationData,
    std::optional<std::map<std::string, unsigned int>> vccsData)
{
    if (!NapiHelpers::callbackAvailable) {
        return;
    }

    if (eventType == afv_native::ClientEventType::VoiceServerConnected) {
        NapiHelpers::callElectron("VoiceConnected");
        MainThreadShared::mApiServer->handleVoiceConnectedEventForWebsocket(true);
    }

    if (eventType == afv_native::ClientEventType::VoiceServerDisconnected) {
        NapiHelpers::callElectron("VoiceDisconnected");
        MainThreadShared::mApiServer->handleVoiceConnectedEventForWebsocket(false);
    }

    if (eventType == afv_native::ClientEventType::StationTransceiversUpdated) {
        if (!string1) {
            return;
        }

        std::string station = string1.value();
        auto transceiverCount = mClient->GetTransceiverCountForStation(station);
        auto states = mClient->getRadioState();
        for (const auto& state : states) {
            if (state.second.stationName == station) {
                mClient->UseTransceiversFromStation(station, static_cast<int>(state.first));
                break;
            }
        }
        SetGuardAndUnicomTransceivers();
        NapiHelpers::callElectron(
            "StationTransceiversUpdated", station, std::to_string(transceiverCount));
    }

    if (eventType == afv_native::ClientEventType::StationDataReceived) {
        if (!stationData || !int1.has_value()) {
            return;
        }
        bool found = int1.value();

        if (!found) {
            NapiHelpers::sendErrorToElectron("Station not found");
            return;
        }

        std::string callsign = stationData->first;
        unsigned int frequency = stationData->second;

        if (mClient->IsFrequencyActive(frequency)) {
            PLOGW << "StationDataReceived: Frequency " << frequency << " already active, skipping";
            return;
        }

        NapiHelpers::callElectron("StationDataReceived", callsign, std::to_string(frequency));
        MainThreadShared::mApiServer->publishStationAdded(callsign, static_cast<int>(frequency));
    }

    if (eventType == afv_native::ClientEventType::VccsReceived) {
        if (!vccsData) {
            return;
        }

        std::map<std::string, unsigned int> stations = vccsData.value();

        for (const auto& station : stations) {
            const std::string& callsign = station.first;
            const unsigned int frequency = station.second;

            if (mClient->IsFrequencyActive(frequency)) {
                PLOGW << "VccsReceived: Frequency " << frequency << " already active, skipping";
                continue;
            }

            NapiHelpers::callElectron("StationDataReceived", callsign, std::to_string(frequency));
            MainThreadShared::mApiServer->publishStationAdded(
                callsign, static_cast<int>(frequency));
        }
    }

    if (eventType == afv_native::ClientEventType::FrequencyRxBegin) {
        if (!int1) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        int frequency = int1.value();
        if (!mClient->IsFrequencyActive(frequency)) {
            PLOGW << "FrequencyRxBegin: Frequency " << frequency << " not active, skipping";
            return;
        }

        NapiHelpers::callElectron("FrequencyRxBegin", std::to_string(frequency));

        return;
    }

    if (eventType == afv_native::ClientEventType::FrequencyRxEnd) {
        if (!int1) {
            return;
        }

        int frequency = int1.value();
        if (!mClient->IsFrequencyActive(frequency)) {
            PLOGW << "FrequencyRxEnd: Frequency " << frequency << " not active, skipping";
            return;
        }

        NapiHelpers::callElectron("FrequencyRxEnd", std::to_string(frequency));
        return;
    }

    if (eventType == afv_native::ClientEventType::StationRxBegin) {
        if (!int1 || !string1) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        int frequency = int1.value();
        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        std::string callsign = string1.value();
        if (!mClient->IsFrequencyActive(frequency)) {
            PLOGW << "StationRxBegin: Frequency " << frequency << " not active, skipping";
            return;
        }

        NapiHelpers::callElectron("StationRxBegin", std::to_string(frequency), callsign);

        MainThreadShared::mApiServer->handleAFVEventForWebsocket(
            sdk::types::Event::kRxBegin, callsign, frequency);

        return;
    }

    if (eventType == afv_native::ClientEventType::StationRxEnd) {
        if (!int1 || !string1) {
            return;
        }

        int frequency = int1.value();
        std::string callsign = string1.value();

        if (!mClient->IsFrequencyActive(frequency)) {
            PLOGW << "StationRxEnd: Frequency " << frequency << " not active, skipping";
            return;
        }

        MainThreadShared::mApiServer->handleAFVEventForWebsocket(
            sdk::types::Event::kRxEnd, callsign, frequency);
    }

    if (eventType == afv_native::ClientEventType::PttOpen) {
        NapiHelpers::callElectron("PttState", "1");
        MainThreadShared::mApiServer->handleAFVEventForWebsocket(
            sdk::types::Event::kTxBegin, std::nullopt, std::nullopt);
    }

    if (eventType == afv_native::ClientEventType::PttClosed) {
        NapiHelpers::callElectron("PttState", "0");
        MainThreadShared::mApiServer->handleAFVEventForWebsocket(
            sdk::types::Event::kTxEnd, std::nullopt, std::nullopt);
    }

    if (eventType == afv_native::ClientEventType::AudioError) {
        NapiHelpers::sendErrorToElectron("Error stating audio devices, check your configuration.");
    }

    if (eventType == afv_native::ClientEventType::APIServerError) {
        if (!int1) {
            return;
        }

        auto err = static_cast<afv_native::afv::APISessionError>(int1.value());

        if (err == afv_native::afv::APISessionError::BadPassword
            || err == afv_native::afv::APISessionError::RejectedCredentials) {
            NapiHelpers::sendErrorToElectron("Invalid Credentials");
        }

        if (err == afv_native::afv::APISessionError::ConnectionError) {
            NapiHelpers::sendErrorToElectron(
                "API Connection Error, check your internet connection.");
        }

        if (err == afv_native::afv::APISessionError::BadRequestOrClientIncompatible) {
            NapiHelpers::sendErrorToElectron("Bad Request or Client Incompatible");
        }

        if (err == afv_native::afv::APISessionError::InvalidAuthToken) {
            NapiHelpers::sendErrorToElectron("Invalid Auth Token.");
        }

        if (err == afv_native::afv::APISessionError::AuthTokenExpiryTimeInPast) {
            NapiHelpers::sendErrorToElectron(
                "Auth Token has expired, check if your system time is correct.");
        }

        if (err == afv_native::afv::APISessionError::OtherRequestError) {
            NapiHelpers::sendErrorToElectron("Unknown Error with AFV API");
        }
    }
}

Napi::String GetStateFolderNapi(const Napi::CallbackInfo& info)
{
    return Napi::String::New(info.Env(), FileSystem::GetStateFolderPath().string());
}

struct VersionCheckResponse {
    VersionCheckResponse(bool succeded, bool update)
        : success(succeded)
        , needUpdate(update)
    {
    }
    bool success = false;
    bool needUpdate = false;
};

VersionCheckResponse CheckVersionSync()
{
    // We force do a mandatory version check,
    // if version check is succesful and update is needed,
    // the programme won't run

    try {
        std::vector<std::string> versionResponses;

        auto fetchVersion = [&](const std::string& url, const std::string& endpoint) {
            httplib::Client client(url);
            client.set_connection_timeout(5); // 5 seconds of timeout to minimalize waiting
            auto res = client.Get(endpoint);
            if (res && res->status == httplib::StatusCode::OK_200) {
                std::string cleanBody = res->body;
                absl::StripAsciiWhitespace(&cleanBody);
                PLOGI << "Version check response (" + url + "): " << cleanBody;
                versionResponses.push_back(cleanBody);
            } else if (res) {
                PLOGW << "HTTP error (" + url + ")" + std::to_string(res->status);
            } else {
                PLOGW << "Unable to reach (" + url + ") at all or no internet connection";
            }
        };

        std::thread thread1(fetchVersion, VERSION_CHECK_BASE_URL, VERSION_CHECK_ENDPOINT);
        std::thread thread2(fetchVersion, VERSION_CHECK_BASE_URL_CDN, VERSION_CHECK_ENDPOINT_CDN);

        thread1.join();
        if (!versionResponses.empty()) {
            thread2.detach();
        } else {
            thread2.join();
        }

        if (versionResponses.empty()) {
            PLOGE << "Error fetching version!";
            MainThreadShared::ShouldRun = false;
            return { false, false };
        }

        auto mandatoryVersion = semver::version(versionResponses.front());
        if (VERSION < mandatoryVersion) {
            MainThreadShared::ShouldRun = false;
            PLOGE << "Mandatory update required: " << VERSION.to_string() << " -> "
                  << mandatoryVersion.to_string();
            return { true, true };
        }
    } catch (const std::exception& e) {
        MainThreadShared::ShouldRun = false;
        PLOGE << "Error parsing version: " << e.what();
        return { false, false };
    }

    return { true, false };
}

Napi::Object Bootstrap(const Napi::CallbackInfo& info)
{
    LogFactory::createLoggers();
    PLOGI << "Starting TrackAudio...";
    auto outObject = Napi::Object::New(info.Env());

    outObject["version"] = Napi::String::New(info.Env(), VERSION.to_string());
    outObject["canRun"] = Napi::Boolean::New(info.Env(), true);
    outObject["needUpdate"] = Napi::Boolean::New(info.Env(), false);
    outObject["checkSuccessful"] = Napi::Boolean::New(info.Env(), true);

    PLOGI << "Checking version...";
    const auto versionCheckResponse = CheckVersionSync();
    PLOGI << "Version check response obtained, verifying...";

    if (!versionCheckResponse.success) {
        outObject["canRun"] = Napi::Boolean::New(info.Env(), false);
        outObject["checkSuccessful"] = Napi::Boolean::New(info.Env(), versionCheckResponse.success);
        PLOGE << "Version check failed, cannot run TrackAudio";
        return outObject;
    }

    if (versionCheckResponse.needUpdate) {
        outObject["needUpdate"] = Napi::Boolean::New(info.Env(), true);
        outObject["canRun"] = Napi::Boolean::New(info.Env(), false);
        PLOGE << "Mandatory update required, cannot run TrackAudio";
        return outObject;
    }

    PLOGI << "Version check successful, continuing...";

    std::string resourcePath = info[0].As<Napi::String>().Utf8Value();
    mClient = std::make_unique<afv_native::api::atcClient>(CLIENT_NAME, resourcePath);
    MainThreadShared::mRemoteDataHandler = std::make_unique<RemoteData>();

    // Setup afv
    mClient->RaiseModernClientEvent(std::function(&HandleAfvEvents));

    MainThreadShared::mApiServer = std::make_shared<SDK>();

    try {
        MainThreadShared::inputHandler = std::make_unique<InputHandler>();
    } catch (const std::exception& e) {
        outObject["canRun"] = Napi::Boolean::New(info.Env(), false);
        PLOGE << "Error creating input handler: " << e.what();
    }

    UserSettings::load();

    return outObject;
}

Napi::Boolean Exit(const Napi::CallbackInfo& info)
{
    PLOGI << "Awaiting to exit TrackAudio...";
    NapiHelpers::_requestExit.store(true);
    if (mClient->IsVoiceConnected()) {
        PLOGI << "Connection to network detected, forcing disconnect...";
        mClient->Disconnect();
    }

    MainThreadShared::mApiServer.reset();
    MainThreadShared::mRemoteDataHandler.reset();
    MainThreadShared::inputHandler.reset();

    mClient.reset();
    PLOGI << "Exiting TrackAudio...";
    LogFactory::destroyLoggers();

    return Napi::Boolean::New(info.Env(), true);
}

Napi::String GetLoggerFilePath(const Napi::CallbackInfo& info)
{
    return Napi::String::New(info.Env(), LogFactory::getLoggerFilePath());
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{

    exports.Set(Napi::String::New(env, "GetVersion"), Napi::Function::New(env, Version));

    exports.Set(Napi::String::New(env, "GetAudioApis"), Napi::Function::New(env, GetAudioApis));

    exports.Set(Napi::String::New(env, "GetAudioInputDevices"),
        Napi::Function::New(env, GetAudioInputDevices));

    exports.Set(Napi::String::New(env, "GetAudioOutputDevices"),
        Napi::Function::New(env, GetAudioOutputDevices));

    exports.Set(Napi::String::New(env, "Connect"), Napi::Function::New(env, Connect));

    exports.Set(Napi::String::New(env, "Disconnect"), Napi::Function::New(env, Disconnect));

    exports.Set(
        Napi::String::New(env, "SetAudioSettings"), Napi::Function::New(env, SetAudioSettings));

    exports.Set(Napi::String::New(env, "AddFrequency"), Napi::Function::New(env, AddFrequency));

    exports.Set(
        Napi::String::New(env, "RemoveFrequency"), Napi::Function::New(env, RemoveFrequency));

    exports.Set(
        Napi::String::New(env, "SetFrequencyState"), Napi::Function::New(env, SetFrequencyState));

    exports.Set(
        Napi::String::New(env, "GetFrequencyState"), Napi::Function::New(env, GetFrequencyState));

    exports.Set(
        Napi::String::New(env, "RegisterCallback"), Napi::Function::New(env, RegisterCallback));

    exports.Set(Napi::String::New(env, "GetStation"), Napi::Function::New(env, GetStation));

    exports.Set(Napi::String::New(env, "RefreshStation"), Napi::Function::New(env, RefreshStation));

    exports.Set(
        Napi::String::New(env, "IsFrequencyActive"), Napi::Function::New(env, IsFrequencyActive));

    exports.Set(Napi::String::New(env, "Reset"), Napi::Function::New(env, Reset));

    exports.Set(Napi::String::New(env, "SetCid"), Napi::Function::New(env, SetCid));

    exports.Set(Napi::String::New(env, "SetPtt"), Napi::Function::New(env, SetPtt));

    exports.Set(Napi::String::New(env, "SetFrequencyRadioGain"),
        Napi::Function::New(env, SetFrequencyRadioGain));

    exports.Set(Napi::String::New(env, "SetRadioGain"), Napi::Function::New(env, SetRadioGain));

    exports.Set(
        Napi::String::New(env, "SetRadioEffects"), Napi::Function::New(env, SetRadioEffects));

    exports.Set(
        Napi::String::New(env, "SetHardwareType"), Napi::Function::New(env, SetHardwareType));

    exports.Set(Napi::String::New(env, "Bootstrap"), Napi::Function::New(env, Bootstrap));

    exports.Set(Napi::String::New(env, "IsConnected"), Napi::Function::New(env, IsConnected));

    exports.Set(
        Napi::String::New(env, "GetStateFolder"), Napi::Function::New(env, GetStateFolderNapi));

    exports.Set(Napi::String::New(env, "StartMicTest"), Napi::Function::New(env, StartMicTest));

    exports.Set(Napi::String::New(env, "StopMicTest"), Napi::Function::New(env, StopMicTest));

    exports.Set(Napi::String::New(env, "StartAudio"), Napi::Function::New(env, StartAudio));

    exports.Set(Napi::String::New(env, "StopAudio"), Napi::Function::New(env, StopAudio));

    exports.Set(Napi::String::New(env, "SetupPttBegin"), Napi::Function::New(env, SetupPttBegin));

    exports.Set(Napi::String::New(env, "SetupPttEnd"), Napi::Function::New(env, SetupPttEnd));

    exports.Set(Napi::String::New(env, "ClearPtt"), Napi::Function::New(env, ClearPtt));

    exports.Set(
        Napi::String::New(env, "RequestPttKeyName"), Napi::Function::New(env, RequestPttKeyName));

    exports.Set(
        Napi::String::New(env, "GetLoggerFilePath"), Napi::Function::New(env, GetLoggerFilePath));

    exports.Set(Napi::String::New(env, "Exit"), Napi::Function::New(env, Exit));

    return exports;
}
NODE_API_MODULE(addon, Init)
}

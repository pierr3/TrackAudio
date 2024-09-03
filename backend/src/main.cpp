#include "LogFactory.h"
#include "afv-native/atcClientWrapper.h"
#include "afv-native/event.h"
#include "afv-native/hardwareType.h"
#include "spdlog/sinks/rotating_file_sink.h"
#include "spdlog/spdlog.h"
#include <absl/strings/ascii.h>
#include <absl/strings/match.h>
#include <atomic>
#include <chrono>
#include <cstddef>
#include <httplib.h>
#include <memory>
#include <mutex>
#include <napi.h>
#include <optional>
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

void SetAudioSettings(const Napi::CallbackInfo& info)
{
    if (mClient->IsVoiceConnected()) {
        return; // Don't allow changing audio settings while connected
    }
    int apiId = info[0].As<Napi::Number>().Int32Value();
    auto inputDeviceId = info[1].As<Napi::String>().Utf8Value();
    auto headsetOutputDeviceId = info[2].As<Napi::String>().Utf8Value();
    auto speakersOutputDeviceId = info[3].As<Napi::String>().Utf8Value();

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
        TRACK_LOG_WARNING("Could not add frequency, it already exists: {} {}", frequency, callsign);
        return Napi::Boolean::New(info.Env(), false);
    }

    RadioState newState;

    newState.frequency = frequency;
    newState.rx = false;
    newState.tx = false;
    newState.xc = false;
    newState.headset = true;
    newState.xca = false;

    auto result = RadioHelper::SetRadioState(MainThreadShared::mApiServer, newState);
    return Napi::Boolean::New(info.Env(), result);
}

void RemoveFrequency(const Napi::CallbackInfo& info)
{
    RadioState newState;

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
    RadioState newState;

    newState.frequency = info[0].As<Napi::Number>().Int32Value();
    newState.rx = info[1].As<Napi::Boolean>().Value();
    newState.tx = info[2].As<Napi::Boolean>().Value();
    newState.xc = info[3].As<Napi::Boolean>().Value();
    // Note the negation here, as the API uses the opposite of what is saved internally
    newState.headset = !info[4].As<Napi::Boolean>().Value();
    newState.xca = info[5].As<Napi::Boolean>().Value(); // Not used

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

    if (hardwareTypeIndex == 3) {
        hardware = afv_native::HardwareType::No_Hardware;
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

    mClient->SetRadioGainAll(gain);
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
        TRACK_LOG_WARNING("Attempted to start mic test without callback or "
                          "uninitiated client, or already running mic test, this "
                          "will be useless");
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
        TRACK_LOG_WARNING("Attempted to start audio when audio already running");
        return;
    }

    mClient->StartAudio();
}

void StopAudio(const Napi::CallbackInfo& /*info*/)
{
    if (!mClient || !mClient->IsAudioRunning()) {
        TRACK_LOG_WARNING("Attempted to stop audio when audio not running");
        return;
    }

    mClient->StopAudio();
}

void SetupPttBegin(const Napi::CallbackInfo& info)
{
    int pttIndex = info[0].As<Napi::Number>().Int32Value();

    MainThreadShared::inputHandler->startPttSetup(pttIndex);
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
static void HandleAfvEvents(afv_native::ClientEventType eventType, void* data, void* data2)
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
        if (data == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        std::string station = *reinterpret_cast<std::string*>(data);
        auto transceiverCount = mClient->GetTransceiverCountForStation(station);
        auto states = mClient->getRadioState();
        for (const auto& state : states) {
            if (state.second.stationName == station) {
                mClient->UseTransceiversFromStation(station, static_cast<int>(state.first));
                break;
            }
        }

        NapiHelpers::callElectron(
            "StationTransceiversUpdated", station, std::to_string(transceiverCount));
    }

    if (eventType == afv_native::ClientEventType::StationDataReceived) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        bool found = *reinterpret_cast<bool*>(data);
        if (!found) {
            NapiHelpers::sendErrorToElectron("Station not found");
            return;
        }
        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        auto stationData = *reinterpret_cast<std::pair<std::string, unsigned int>*>(data2);
        std::string callsign = stationData.first;
        unsigned int frequency = stationData.second;

        if (mClient->IsFrequencyActive(frequency)) {
            TRACK_LOG_WARNING(
                "StationDataReceived: Frequency {} already active, skipping", frequency);
            return;
        }

        NapiHelpers::callElectron("StationDataReceived", callsign, std::to_string(frequency));
        MainThreadShared::mApiServer->publishStationAdded(callsign, frequency);
    }

    if (eventType == afv_native::ClientEventType::VccsReceived) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        std::map<std::string, unsigned int> stations
            // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
            = *reinterpret_cast<std::map<std::string, unsigned int>*>(data2);

        for (const auto& station : stations) {
            const std::string& callsign = station.first;
            const unsigned int frequency = station.second;

            if (mClient->IsFrequencyActive(frequency)) {
                TRACK_LOG_WARNING("VccsReceived: Frequency {} already active, skipping", frequency);
                continue;
            }

            NapiHelpers::callElectron("StationDataReceived", callsign, std::to_string(frequency));
            MainThreadShared::mApiServer->publishStationAdded(callsign, frequency);
        }
    }

    if (eventType == afv_native::ClientEventType::FrequencyRxBegin) {
        if (data == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        int frequency = *reinterpret_cast<int*>(data);
        if (!mClient->IsFrequencyActive(frequency)) {
            TRACK_LOG_WARNING("FrequencyRxBegin: Frequency {} not active, skipping", frequency);
            return;
        }

        NapiHelpers::callElectron("FrequencyRxBegin", std::to_string(frequency));

        return;
    }

    if (eventType == afv_native::ClientEventType::FrequencyRxEnd) {
        if (data == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        int frequency = *reinterpret_cast<int*>(data);
        if (!mClient->IsFrequencyActive(frequency)) {
            TRACK_LOG_WARNING("FrequencyRxEnd: Frequency {} not active, skipping", frequency);
            return;
        }

        NapiHelpers::callElectron("FrequencyRxEnd", std::to_string(frequency));
        return;
    }

    if (eventType == afv_native::ClientEventType::StationRxBegin) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        int frequency = *reinterpret_cast<int*>(data);
        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        std::string callsign = *reinterpret_cast<std::string*>(data2);
        if (!mClient->IsFrequencyActive(frequency)) {
            TRACK_LOG_WARNING("StationRxBegin: Frequency {} not active, skipping", frequency);
            return;
        }

        NapiHelpers::callElectron("StationRxBegin", std::to_string(frequency), callsign);

        MainThreadShared::mApiServer->handleAFVEventForWebsocket(
            sdk::types::Event::kRxBegin, callsign, frequency);

        return;
    }

    if (eventType == afv_native::ClientEventType::StationRxEnd) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        int frequency = *reinterpret_cast<int*>(data);
        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        std::string callsign = *reinterpret_cast<std::string*>(data2);

        if (!mClient->IsFrequencyActive(frequency)) {
            TRACK_LOG_WARNING("StationRxEnd: Frequency {} not active, skipping", frequency);
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
        if (data == nullptr) {
            return;
        }

        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        auto err = *reinterpret_cast<afv_native::afv::APISessionError*>(data);

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

void CreateLogFolders()
{
    if (!std::filesystem::exists(FileSystem::GetStateFolderPath())) {
        std::error_code err;
        if (!std::filesystem::create_directory(FileSystem::GetStateFolderPath(), err)) {
            TRACK_LOG_ERROR("Could not create state directory at {}: {}",
                FileSystem::GetStateFolderPath().string(), err.message());
        }
    }
}

bool CheckVersionSync(const Napi::CallbackInfo& /*info*/)
{
    // We force do a mandatory version check, if an update is needed, the
    // programme won't run

    try {
        httplib::Client client(VERSION_CHECK_BASE_URL);
        auto res = client.Get(VERSION_CHECK_ENDPOINT);
        if (!res || res->status != httplib::StatusCode::OK_200) {
            MainThreadShared::ShouldRun = false;
            TRACK_LOG_CRITICAL("Error fetching version: {}", res->status);
            return false;
        }

        std::string cleanBody = res->body;
        absl::StripAsciiWhitespace(&cleanBody);
        auto mandatoryVersion = semver::version(cleanBody);
        if (VERSION < mandatoryVersion) {
            MainThreadShared::ShouldRun = false;
            TRACK_LOG_ERROR("Mandatory update required: {} -> {}", VERSION.to_string(),
                mandatoryVersion.to_string());
            return false;
        }
    } catch (const std::exception& e) {
        MainThreadShared::ShouldRun = false;
        TRACK_LOG_CRITICAL("Error parsing version: {}", e.what());
        return false;
    }

    return true;
}

Napi::Object Bootstrap(const Napi::CallbackInfo& info)
{
    auto outObject = Napi::Object::New(info.Env());
    LogFactory::createLoggers();

    outObject["version"] = Napi::String::New(info.Env(), VERSION.to_string());
    outObject["canRun"] = Napi::Boolean::New(info.Env(), true);
    outObject["needUpdate"] = Napi::Boolean::New(info.Env(), false);

    if (!CheckVersionSync(info)) {
        outObject["needUpdate"] = Napi::Boolean::New(info.Env(), true);
        outObject["canRun"] = Napi::Boolean::New(info.Env(), false);
        return outObject;
    }

    std::string resourcePath = info[0].As<Napi::String>().Utf8Value();
    mClient = std::make_unique<afv_native::api::atcClient>(CLIENT_NAME, resourcePath);
    MainThreadShared::mRemoteDataHandler = std::make_unique<RemoteData>();

    // Setup afv
    mClient->RaiseClientEvent([](afv_native::ClientEventType eventType, void* data1, void* data2) {
        HandleAfvEvents(eventType, data1, data2);
    });

    MainThreadShared::mApiServer = std::make_shared<SDK>();

    try {
        MainThreadShared::inputHandler = std::make_unique<InputHandler>();
    } catch (const std::exception& e) {
        outObject["canRun"] = Napi::Boolean::New(info.Env(), false);
        TRACK_LOG_CRITICAL("Error creating input handler: {}", e.what());
    }

    UserSettings::load();

    return outObject;
}

Napi::Boolean Exit(const Napi::CallbackInfo& info)
{
    TRACK_LOG_INFO("Awaiting to exit TrackAudio...");
    std::lock_guard<std::mutex> HelperLock(NapiHelpers::_callElectronMutex);
    TRACK_LOG_INFO("Exiting TrackAudio...")
    if (mClient->IsVoiceConnected()) {
        mClient->Disconnect();
    }
    MainThreadShared::mApiServer.reset();
    MainThreadShared::mRemoteDataHandler.reset();
    MainThreadShared::inputHandler.reset();

    mClient.reset();
    LogFactory::destroyLoggers();

    return Napi::Boolean::New(info.Env(), true);
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

    exports.Set(Napi::String::New(env, "SetRadioGain"), Napi::Function::New(env, SetRadioGain));

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

    exports.Set(
        Napi::String::New(env, "RequestPttKeyName"), Napi::Function::New(env, RequestPttKeyName));

    exports.Set(Napi::String::New(env, "Exit"), Napi::Function::New(env, Exit));

    return exports;
}

NODE_API_MODULE(addon, Init)

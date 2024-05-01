#include <absl/strings/ascii.h>
#include <absl/strings/match.h>
#include <afv-native/afv_native.h>
#include <atomic>
#include <chrono>
#include <cstddef>
#include <httplib.h>
#include <memory>
#include <napi.h>
#include <quill/LogLevel.h>
#include <quill/Quill.h>
#include <quill/detail/LogMacros.h>
#include <sago/platform_folders.h>
#include <semver.hpp>
#include <string>
#include <thread>

#include "Helpers.hpp"
#include "RemoteData.hpp"
#include "Shared.hpp"
#include "sdk.hpp"

static std::unique_ptr<RemoteData> mRemoteDataHandler = nullptr;
static std::unique_ptr<SDK> mApiServer = nullptr;

static bool ShouldRun = true;

static std::unique_ptr<std::thread> vuMeterThread = nullptr;
static std::atomic_bool runVuMeterCallback = false;

Napi::Array GetAudioApis(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    Napi::Array arr = Napi::Array::New(env);

    for (const auto [apiId, apiName] : mClient->GetAudioApis()) {
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

    for (const auto [deviceId, deviceName, isDefault] :
        mClient->GetAudioInputDevices(apiId)) {
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

    for (const auto [deviceId, deviceName, isDefault] :
        mClient->GetAudioOutputDevices(apiId)) {
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
    if (!ShouldRun) {
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

void Disconnect(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return;
    }
    mClient->Disconnect();
    mApiServer->handleAFVEventForWebsocket(
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
        Helpers::CallbackWithError("Could not add frequency: it already exists");
        LOG_WARNING(logger, "Could not add frequency, it already exists: {} {}",
            frequency, callsign);
        return Napi::Boolean::New(info.Env(), false);
    }
    mClient->SetRx(frequency, false);
    mClient->SetRadioGainAll(UserSession::currentRadioGain);

    mApiServer->handleAFVEventForWebsocket(
        sdk::types::Event::kFrequencyStateUpdate, {}, {});

    return Napi::Boolean::New(info.Env(), true);
}

void RemoveFrequency(const Napi::CallbackInfo& info)
{
    int frequency = info[0].As<Napi::Number>().Int32Value();
    mClient->RemoveFrequency(frequency);
    mApiServer->handleAFVEventForWebsocket(
        sdk::types::Event::kFrequencyStateUpdate, {}, {});
}

void Reset(const Napi::CallbackInfo& info) { mClient->reset(); }

Napi::Boolean SetFrequencyState(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return Napi::Boolean::New(info.Env(), false);
    }

    int frequency = info[0].As<Napi::Number>().Int32Value();
    if (!mClient->IsFrequencyActive(frequency)) {
        return Napi::Boolean::New(info.Env(), false);
    }

    bool rx = info[1].As<Napi::Boolean>().Value();
    bool tx = info[2].As<Napi::Boolean>().Value();
    bool xc = info[3].As<Napi::Boolean>().Value();
    bool onSpeaker = info[4].As<Napi::Boolean>().Value();
    bool crossCoupleAcrossFrequencies = info[5].As<Napi::Boolean>().Value(); // Not used

    if (!mClient->GetRxState(frequency) && rx) {
        // When turning on RX, we refresh the transceivers
        auto states = mClient->getRadioState();
        if (states.find(frequency) != states.end() && !states[frequency].stationName.empty()) {
            mClient->FetchTransceiverInfo(states[frequency].stationName);
        }
    }

    mClient->SetRx(frequency, rx);
    mClient->SetRadioGainAll(UserSession::currentRadioGain);
    if (UserSession::isATC) {
        mClient->SetTx(frequency, tx);
        mClient->SetXc(frequency, xc);
        mClient->SetCrossCoupleAcross(frequency, crossCoupleAcrossFrequencies);
    } else {
        mClient->SetTx(frequency, false);
        mClient->SetXc(frequency, false);
        mClient->SetCrossCoupleAcross(frequency, false);
    }

    mClient->SetOnHeadset(frequency, !onSpeaker);

    mApiServer->handleAFVEventForWebsocket(
        sdk::types::Event::kFrequencyStateUpdate, {}, {});

    return Napi::Boolean::New(info.Env(), true);
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
    callbackRef = Napi::ThreadSafeFunction::New(
        env, callbackFunction, "trackaudio-afv-res", 0, 1, [](Napi::Env) {});
    callbackAvailable = true;
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

    mClient->SetHardware(hardware);
}

void SetPtt(const Napi::CallbackInfo& info)
{
    if (!mClient->IsVoiceConnected()) {
        return;
    }

    if (!UserSession::isATC) {
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

void StartMicTest(const Napi::CallbackInfo& info)
{
    if (!mClient || !callbackAvailable || vuMeterThread != nullptr) {
        LOG_WARNING(logger, "Attempted to start mic test without callback or "
                            "uninitiated client, or already running mic test, this "
                            "will be useless");
        return;
    }

    mClient->StartAudio();
    runVuMeterCallback = true;

    vuMeterThread = std::make_unique<std::thread>([] {
        for (int i = 0; i < 2400;
             i++) { // Max of 2 minutes, don't allow infinite test
#ifndef WIN32
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
#else
            Sleep(50); // std::this_thread::sleep_for is boinked on windows
#endif
            if (!mClient->IsAudioRunning()) {
                break;
            }

            if (!runVuMeterCallback) {
                break;
            }

            auto vuMeter = mClient->GetInputVu();
            auto vuMeterPeak = mClient->GetInputPeak();

            callbackRef.NonBlockingCall(
                [vuMeter, vuMeterPeak](Napi::Env env, Napi::Function jsCallback) {
                    jsCallback.Call(
                        { Napi::String::New(env, "VuMeter"),
                            Napi::String::New(env, std::to_string(vuMeter)),
                            Napi::String::New(env, std::to_string(vuMeterPeak)) });
                });
        }
    });
}

void StopMicTest(const Napi::CallbackInfo& info)
{
    if (!mClient) {
        return;
    }

    runVuMeterCallback = false;
    if (vuMeterThread && vuMeterThread->joinable()) {
        vuMeterThread->join();
    }
    vuMeterThread.reset(nullptr);

    mClient->StopAudio();
}

void StartAudio(const Napi::CallbackInfo& info)
{
    if (!mClient || mClient->IsAudioRunning()) {
        LOG_WARNING(logger, "Attempted to start audio when audio already running");
        return;
    }

    mClient->StartAudio();
}

void StopAudio(const Napi::CallbackInfo& info)
{
    if (!mClient || !mClient->IsAudioRunning()) {
        LOG_WARNING(logger, "Attempted to stop audio when audio not running");
        return;
    }

    mClient->StopAudio();
}

static void HandleAfvEvents(afv_native::ClientEventType eventType, void* data,
    void* data2)
{
    if (!callbackAvailable) {
        return;
    }

    if (eventType == afv_native::ClientEventType::VoiceServerConnected) {
        callbackRef.NonBlockingCall([](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({ Napi::String::New(env, "VoiceConnected"),
                Napi::String::New(env, ""), Napi::String::New(env, "") });
        });
    }

    if (eventType == afv_native::ClientEventType::VoiceServerDisconnected) {
        callbackRef.NonBlockingCall([](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({ Napi::String::New(env, "VoiceDisconnected"),
                Napi::String::New(env, ""), Napi::String::New(env, "") });
        });
    }

    if (eventType == afv_native::ClientEventType::StationTransceiversUpdated) {
        if (data == nullptr) {
            return;
        }

        std::string station = *reinterpret_cast<std::string*>(data);
        auto transceiverCount = mClient->GetTransceiverCountForStation(station);
        callbackRef.NonBlockingCall(
            [transceiverCount, station](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call(
                    { Napi::String::New(env, "StationTransceiversUpdated"),
                        Napi::String::New(env, station),
                        Napi::String::New(env, std::to_string(transceiverCount)) });
            });
    }

    if (eventType == afv_native::ClientEventType::StationDataReceived) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        bool found = *reinterpret_cast<bool*>(data);
        if (!found) {
            Helpers::CallbackWithError("Station not found");
            return;
        }
        auto stationData = *reinterpret_cast<std::pair<std::string, unsigned int>*>(data2);
        std::string callsign = stationData.first;
        unsigned int frequency = stationData.second;

        if (mClient->IsFrequencyActive(frequency)) {
            return;
        }

        callbackRef.NonBlockingCall(
            [callsign, frequency](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call({ Napi::String::New(env, "StationDataReceived"),
                    Napi::String::New(env, callsign),
                    Napi::String::New(env, std::to_string(frequency)) });
            });
    }

    if (eventType == afv_native::ClientEventType::VccsReceived) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }
        std::map<std::string, unsigned int> stations = *reinterpret_cast<std::map<std::string, unsigned int>*>(data2);

        for (const auto& station : stations) {
            const std::string& callsign = station.first;
            const unsigned int frequency = station.second;

            if (mClient->IsFrequencyActive(frequency)) {
                continue;
            }

            callbackRef.NonBlockingCall(
                [callsign, frequency](Napi::Env env, Napi::Function jsCallback) {
                    jsCallback.Call(
                        { Napi::String::New(env, "StationDataReceived"),
                            Napi::String::New(env, callsign),
                            Napi::String::New(env, std::to_string(frequency)) });
                });
        }
    }

    if (eventType == afv_native::ClientEventType::FrequencyRxBegin) {
        if (data == nullptr) {
            return;
        }

        int frequency = *reinterpret_cast<int*>(data);
        callbackRef.NonBlockingCall(
            [frequency](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call({ Napi::String::New(env, "FrequencyRxBegin"),
                    Napi::String::New(env, std::to_string(frequency)),
                    Napi::String::New(env, "") });
            });

        return;
    }

    if (eventType == afv_native::ClientEventType::FrequencyRxEnd) {
        if (data == nullptr) {
            return;
        }

        int frequency = *reinterpret_cast<int*>(data);
        callbackRef.NonBlockingCall(
            [frequency](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call({ Napi::String::New(env, "FrequencyRxEnd"),
                    Napi::String::New(env, std::to_string(frequency)),
                    Napi::String::New(env, "") });
            });
        return;
    }

    if (eventType == afv_native::ClientEventType::StationRxBegin) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        int frequency = *reinterpret_cast<int*>(data);
        std::string callsign = *reinterpret_cast<std::string*>(data2);
        callbackRef.NonBlockingCall(
            [frequency, callsign](Napi::Env env, Napi::Function jsCallback) {
                LOG_TRACE_L1(logger, "StationRxBegin to node: {} {}", frequency, callsign);
                jsCallback.Call({ Napi::String::New(env, "StationRxBegin"),
                    Napi::String::New(env, std::to_string(frequency)),
                    Napi::String::New(env, callsign) });
            });

        mApiServer->handleAFVEventForWebsocket(sdk::types::Event::kRxBegin,
            callsign, frequency);

        return;
    }

    if (eventType == afv_native::ClientEventType::StationRxEnd) {
        if (data == nullptr || data2 == nullptr) {
            return;
        }

        int frequency = *reinterpret_cast<int*>(data);
        std::string callsign = *reinterpret_cast<std::string*>(data2);

        mApiServer->handleAFVEventForWebsocket(sdk::types::Event::kRxEnd, callsign,
            frequency);
    }

    if (eventType == afv_native::ClientEventType::PttOpen) {

        callbackRef.NonBlockingCall([](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({ Napi::String::New(env, "PttState"),
                Napi::String::New(env, "1"),
                Napi::String::New(env, "") });
        });
    }

    if (eventType == afv_native::ClientEventType::PttClosed) {
        callbackRef.NonBlockingCall([](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({ Napi::String::New(env, "PttState"),
                Napi::String::New(env, "0"),
                Napi::String::New(env, "") });
        });
    }

    if (eventType == afv_native::ClientEventType::AudioError) {
        Helpers::CallbackWithError(
            "Error stating audio devices, check your configuration.");
    }

    if (eventType == afv_native::ClientEventType::APIServerError) {
        if (data == nullptr) {
            return;
        }

        auto err = *reinterpret_cast<afv_native::afv::APISessionError*>(data);

        if (err == afv_native::afv::APISessionError::BadPassword || err == afv_native::afv::APISessionError::RejectedCredentials) {
            Helpers::CallbackWithError("Invalid Credentials");
        }

        if (err == afv_native::afv::APISessionError::ConnectionError) {
            Helpers::CallbackWithError(
                "API Connection Error, check your internet connection.");
        }

        if (err == afv_native::afv::APISessionError::BadRequestOrClientIncompatible) {
            Helpers::CallbackWithError("Bad Request or Client Incompatible");
        }

        if (err == afv_native::afv::APISessionError::InvalidAuthToken) {
            Helpers::CallbackWithError("Invalid Auth Token.");
        }

        if (err == afv_native::afv::APISessionError::AuthTokenExpiryTimeInPast) {
            Helpers::CallbackWithError(
                "Auth Token has expired, check if your system time is correct.");
        }

        if (err == afv_native::afv::APISessionError::OtherRequestError) {
            Helpers::CallbackWithError("Unknown Error with AFV API");
        }
    }
}

std::filesystem::path GetStateFolderPath()
{
    return std::filesystem::path(sago::getStateDir()) / "trackaudio";
}

Napi::String GetStateFolderNapi(const Napi::CallbackInfo& info)
{
    return Napi::String::New(info.Env(), GetStateFolderPath().string());
}

void CreateLogFolders()
{
    if (!std::filesystem::exists(GetStateFolderPath())) {
        std::error_code err;
        if (!std::filesystem::create_directory(GetStateFolderPath(), err)) {
            LOG_ERROR(logger, "Could not create state directory at {}: {}",
                GetStateFolderPath().string(), err.message());
        }
    }
}

void CreateLoggers()
{
    quill::configure([]() {
        quill::Config cfg;
        return cfg;
    }());

    // Starts the logging backend thread
    quill::start();

    std::shared_ptr<quill::Handler> trackaudio_logger = quill::rotating_file_handler(
        GetStateFolderPath() / "trackaudio.log", []() {
            quill::RotatingFileHandlerConfig cfg;
            cfg.set_rotation_max_file_size(5e+6); // 5MB files
            cfg.set_max_backup_files(2);
            cfg.set_overwrite_rolled_files(true);
            return cfg;
        }());

    logger = quill::create_logger("trackaudio_logger", std::move(trackaudio_logger));

    logger->set_log_level(quill::LogLevel::Info);

    std::shared_ptr<quill::Handler> afv_logger = quill::rotating_file_handler(
        GetStateFolderPath() / "trackaudio-afv.log", []() {
            quill::RotatingFileHandlerConfig cfg;
            cfg.set_rotation_max_file_size(5e+6); // 5MB files
            cfg.set_max_backup_files(2);
            cfg.set_overwrite_rolled_files(true);
            cfg.set_pattern("%(ascii_time) [%(thread)] %(message)");
            return cfg;
        }());

    // Create a file logger
    auto _ = quill::create_logger("afv_logger", std::move(afv_logger));

    afv_native::api::setLogger([](std::string subsystem, std::string file,
                                   int line, std::string lineOut) {
        auto logger = quill::get_logger("afv_logger");
        auto strippedFiledName = file.substr(file.find_last_of("/") + 1);
        LOG_INFO(logger, "[{}] [{}@{}] {}", subsystem, strippedFiledName, line,
            lineOut);
    });
}

bool CheckVersionSync(const Napi::CallbackInfo& info)
{
    // We force do a mandatory version check, if an update is needed, the
    // programme won't run

    httplib::Client client(VERSION_CHECK_BASE_URL);
    auto res = client.Get(VERSION_CHECK_ENDPOINT);
    if (!res || res->status != 200) {
        ShouldRun = false;
        LOG_CRITICAL(logger, "Error fetching version: {}", res->status);
        return false;
    }

    try {
        std::string cleanBody = res->body;
        absl::StripAsciiWhitespace(&cleanBody);
        semver::version mandatoryVersion = semver::version(cleanBody);
        if (VERSION < mandatoryVersion) {
            ShouldRun = false;
            LOG_ERROR(logger, "Mandatory update required: {} -> {}",
                VERSION.to_string(), mandatoryVersion.to_string());
            return false;
        }
    } catch (const std::exception& e) {
        ShouldRun = false;
        LOG_CRITICAL(logger, "Error parsing version: {}", e.what());
        return false;
    }

    return true;
}

Napi::Boolean Bootstrap(const Napi::CallbackInfo& info)
{

    CreateLoggers();

    if (!CheckVersionSync(info)) {
        return Napi::Boolean::New(info.Env(), false);
    }

    std::string resourcePath = info[0].As<Napi::String>().Utf8Value();
    mClient = std::make_unique<afv_native::api::atcClient>(CLIENT_NAME, resourcePath);
    mRemoteDataHandler = std::make_unique<RemoteData>();

    // Setup afv
    mClient->RaiseClientEvent(
        [](afv_native::ClientEventType eventType, void* data1, void* data2) {
            HandleAfvEvents(eventType, data1, data2);
        });

    mApiServer = std::make_unique<SDK>();

    return Napi::Boolean::New(info.Env(), true);
}

void Exit(const Napi::CallbackInfo& info)
{
    LOG_INFO(logger, "Exiting TrackAudio");
    if (mClient->IsVoiceConnected()) {
        mClient->Disconnect();
    }
    mApiServer.reset();
    mRemoteDataHandler.reset();

    mClient.reset();
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{

    exports.Set(Napi::String::New(env, "GetVersion"),
        Napi::Function::New(env, Version));

    exports.Set(Napi::String::New(env, "GetAudioApis"),
        Napi::Function::New(env, GetAudioApis));

    exports.Set(Napi::String::New(env, "GetAudioInputDevices"),
        Napi::Function::New(env, GetAudioInputDevices));

    exports.Set(Napi::String::New(env, "GetAudioOutputDevices"),
        Napi::Function::New(env, GetAudioOutputDevices));

    exports.Set(Napi::String::New(env, "Connect"),
        Napi::Function::New(env, Connect));

    exports.Set(Napi::String::New(env, "Disconnect"),
        Napi::Function::New(env, Disconnect));

    exports.Set(Napi::String::New(env, "SetAudioSettings"),
        Napi::Function::New(env, SetAudioSettings));

    exports.Set(Napi::String::New(env, "AddFrequency"),
        Napi::Function::New(env, AddFrequency));

    exports.Set(Napi::String::New(env, "RemoveFrequency"),
        Napi::Function::New(env, RemoveFrequency));

    exports.Set(Napi::String::New(env, "SetFrequencyState"),
        Napi::Function::New(env, SetFrequencyState));

    exports.Set(Napi::String::New(env, "GetFrequencyState"),
        Napi::Function::New(env, GetFrequencyState));

    exports.Set(Napi::String::New(env, "RegisterCallback"),
        Napi::Function::New(env, RegisterCallback));

    exports.Set(Napi::String::New(env, "GetStation"),
        Napi::Function::New(env, GetStation));

    exports.Set(Napi::String::New(env, "RefreshStation"),
        Napi::Function::New(env, RefreshStation));

    exports.Set(Napi::String::New(env, "IsFrequencyActive"),
        Napi::Function::New(env, IsFrequencyActive));

    exports.Set(Napi::String::New(env, "Reset"), Napi::Function::New(env, Reset));

    exports.Set(Napi::String::New(env, "SetCid"),
        Napi::Function::New(env, SetCid));

    exports.Set(Napi::String::New(env, "SetPtt"),
        Napi::Function::New(env, SetPtt));

    exports.Set(Napi::String::New(env, "SetRadioGain"),
        Napi::Function::New(env, SetRadioGain));

    exports.Set(Napi::String::New(env, "SetHardwareType"),
        Napi::Function::New(env, SetHardwareType));

    exports.Set(Napi::String::New(env, "Bootstrap"),
        Napi::Function::New(env, Bootstrap));

    exports.Set(Napi::String::New(env, "IsConnected"),
        Napi::Function::New(env, IsConnected));

    exports.Set(Napi::String::New(env, "GetStateFolder"),
        Napi::Function::New(env, GetStateFolderNapi));

    exports.Set(Napi::String::New(env, "StartMicTest"),
        Napi::Function::New(env, StartMicTest));

    exports.Set(Napi::String::New(env, "StopMicTest"),
        Napi::Function::New(env, StopMicTest));

    exports.Set(Napi::String::New(env, "StartAudio"),
        Napi::Function::New(env, StartAudio));

    exports.Set(Napi::String::New(env, "StopAudio"),
        Napi::Function::New(env, StopAudio));

    exports.Set(Napi::String::New(env, "Exit"), Napi::Function::New(env, Exit));

    return exports;
}

NODE_API_MODULE(addon, Init)

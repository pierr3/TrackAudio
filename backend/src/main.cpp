#include <absl/strings/match.h>
#include "afv-native/event.h"
#include <afv-native/atcClientWrapper.h>
#include <memory>
#include <napi.h>

using namespace Napi;

#define VERSION "1.0.0"

static std::unique_ptr<afv_native::api::atcClient> mClient =
    std::make_unique<afv_native::api::atcClient>("TrackAudio");

Napi::Array GetAudioApis(const Napi::CallbackInfo &info) {
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

Napi::Array GetAudioInputDevices(const Napi::CallbackInfo &info) {
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

Napi::Array GetAudioOutputDevices(const Napi::CallbackInfo &info) {
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

Napi::Boolean Connect(const Napi::CallbackInfo &info) {
  if (mClient->IsVoiceConnected()) {
    return Napi::Boolean::New(info.Env(), false);
    ;
  }
  Napi::Env env = info.Env();
  auto cid = info[0].As<Napi::String>().Utf8Value();
  auto password = info[1].As<Napi::String>().Utf8Value();
  auto callsign = info[2].As<Napi::String>().Utf8Value();

  mClient->SetCallsign(callsign);
  mClient->SetCredentials(cid, password);
  return Napi::Boolean::New(env, mClient->Connect());
}

void Disconnect(const Napi::CallbackInfo &info) {
  if (!mClient->IsVoiceConnected()) {
    return;
  }
  mClient->Disconnect();
}

void SetAudioSettings(const Napi::CallbackInfo &info) {
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

Napi::Boolean AddFrequency(const Napi::CallbackInfo &info) {
  if (!mClient->IsVoiceConnected()) {
    return Napi::Boolean::New(info.Env(), false);
  }

  int frequency = info[0].As<Napi::Number>().Int32Value();
  auto callsign = info[1].As<Napi::String>().Utf8Value();
  if (mClient->IsFrequencyActive(frequency)) {
    return Napi::Boolean::New(info.Env(), false);
  }

  mClient->AddFrequency(frequency, callsign);
  if (!callsign.empty()) {
    mClient->FetchTransceiverInfo(callsign);
    if (!absl::EndsWith(callsign, "_ATIS")) {
      mClient->SetRx(frequency, true);
    }
  } else {
    mClient->SetRx(frequency, true);
  }

  return Napi::Boolean::New(info.Env(), true);
}

void RemoveFrequency(const Napi::CallbackInfo &info) {
  if (!mClient->IsVoiceConnected()) {
    return;
  }
  int frequency = info[0].As<Napi::Number>().Int32Value();
  mClient->RemoveFrequency(frequency);
}

Napi::String Version(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, VERSION);
}

inline void HandleAfvEvents(afv_native::ClientEventType eventType, void * data1, void * data2) {

}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Setup afv
  mClient->RaiseClientEvent([](afv_native::ClientEventType eventType, void * data1, void * data2) {
    HandleAfvEvents(eventType, data1, data2);
  });


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

  return exports;
}

NODE_API_MODULE(addon, Init)


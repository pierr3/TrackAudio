#pragma once
#include "RadioSimulation.h"
#include "Shared.hpp"

#include <cmath>

class Helpers {
public:
  static int CleanUpFrequency(int frequency) {
    // We don't clean up an unset frequency
    if (std::abs(frequency) == OBS_FREQUENCY) {
      return frequency;
    }

    return RadioSimulation::round8_33kHzChannel(frequency);
  }

  static void CallbackWithError(std::string message) {
    std::lock_guard<std::mutex> lock(errorCallbackMutex);
    if (!callbackAvailable) {
      return;
    }

    callbackRef.NonBlockingCall(
        [message](Napi::Env env, Napi::Function jsCallback) {
          jsCallback.Call({Napi::String::New(env, "error"),
                           Napi::String::New(env, message),
                           Napi::String::New(env, "")});
        });
  }
};
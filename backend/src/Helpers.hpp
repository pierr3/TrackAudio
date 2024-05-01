#pragma once
#include "RadioSimulation.h"
#include "Shared.hpp"

#include <cmath>
#include <mutex>
#include <string>

class Helpers {
public:
    static int CleanUpFrequency(int frequency)
    {
        // We don't clean up an unset frequency
        if (std::abs(frequency) == OBS_FREQUENCY) {
            return frequency;
        }

        return RadioSimulation::round8_33kHzChannel(frequency);
    }

    static void CallbackWithError(const std::string& message)
    {
        std::lock_guard<std::mutex> lock(errorCallbackMutex);
        if (!callbackAvailable) {
            return;
        }

        callbackRef.NonBlockingCall(
            [message](Napi::Env env, Napi::Function jsCallback) {
                jsCallback.Call({ Napi::String::New(env, "error"),
                    Napi::String::New(env, message),
                    Napi::String::New(env, "") });
            });
    }

    static std::string ConvertHzToHumanString(int frequencyHz)
    {
        std::string temp = std::to_string(frequencyHz / 1000);
        return temp.substr(0, 3) + "." + temp.substr(3, 7);
    }
};
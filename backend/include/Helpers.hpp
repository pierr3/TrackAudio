#pragma once
#include "RadioSimulation.h"
#include "Shared.hpp"

#include <cmath>
#include <mutex>
#include <string>

class Helpers {
public:
    /**
     * Cleans up the given frequency value.
     *
     * This function takes an integer frequency value as input and rounds it up to a valid 8.33 kHz
     * channel. The cleaned up frequency value is then returned.
     *
     * @param frequency The frequency value to be cleaned up.
     * @return The cleaned up frequency value.
     */
    static int CleanUpFrequency(int frequency)
    {
        // We don't clean up an unset frequency
        if (std::abs(frequency) == OBS_FREQUENCY) {
            return frequency;
        }

        return RadioSimulation::round8_33kHzChannel(frequency);
    }

    /**
     * Calls the NAPI frontend callback function with an error message.
     *
     * @param message The error message to pass to the callback.
     */
    static void CallbackWithError(const std::string& message)
    {
        std::lock_guard<std::mutex> lock(errorCallbackMutex);
        if (!callbackAvailable) {
            return;
        }

        callbackRef.NonBlockingCall([message](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({ Napi::String::New(env, "error"), Napi::String::New(env, message),
                Napi::String::New(env, "") });
        });
    }

    /**
     * Converts a frequency in Hertz to a human-readable string representation.
     *
     * @param frequencyHz The frequency in Hertz to convert.
     * @return A string representation of the frequency in a human-readable format (e.g. "122.800"
     * for 122800000 Hz)
     */
    static std::string ConvertHzToHumanString(unsigned int frequencyHz)
    {
        std::string temp = std::to_string(frequencyHz / 1000);
        return temp.substr(0, 3) + "." + temp.substr(3, 7);
    }
};
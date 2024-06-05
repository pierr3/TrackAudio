#pragma once
#include "RadioSimulation.h"
#include "Shared.hpp"

#include "spdlog/spdlog.h"
#include <cmath>
#include <mutex>
#include <nlohmann/json.hpp>
#include <sago/platform_folders.h>
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
    inline static int CleanUpFrequency(int frequency)
    {
        // We don't clean up an unset frequency
        if (std::abs(frequency) == OBS_FREQUENCY) {
            return frequency;
        }

        return RadioSimulation::round8_33kHzChannel(frequency);
    }

    /**
     * Converts a frequency in Hertz to a human-readable string representation.
     *
     * @param frequencyHz The frequency in Hertz to convert.
     * @return A string representation of the frequency in a human-readable format (e.g. "122.800"
     * for 122800000 Hz)
     */
    inline static std::string ConvertHzToHumanString(unsigned int frequencyHz)
    {
        std::string temp = std::to_string(frequencyHz / 1000);
        return temp.substr(0, 3) + "." + temp.substr(3, 7);
    }

    /**
     * @brief Converts a JSON property that is either true, false, or "toggle" to a boolean value.
     *
     * @param incomingValue The JSON property to convert.
     * @param currentValue The current value of the property.
     * @return The converted boolean value, either the value specified in the JSON property, or the
     *        opposite of currentValue if the property is "toggle", or the currentValue if
     *        incoming value is undefined or invalid.
     */
    inline static bool ConvertBoolOrToggleToBool(
        const nlohmann::json& incomingValue, bool currentValue)
    {
        if (incomingValue.is_boolean()) {
            TRACK_LOG_TRACE_L1("Received a boolean, returning it: {}", incomingValue.dump());
            return incomingValue.get<bool>();
        } else if (incomingValue.is_string() && incomingValue.get<std::string>() == "toggle") {
            TRACK_LOG_TRACE_L1("Received \"toggle\", returning {}, the inverse of {}",
                !currentValue, currentValue);
            return !currentValue;
        } else {
            TRACK_LOG_TRACE_L1("Invalid value for boolean property: {}, returning {}",
                incomingValue.dump(), currentValue);
            return currentValue;
        }
    }
};

class NapiHelpers {
public:
    inline static std::unique_ptr<Napi::ThreadSafeFunction> callbackRef = nullptr;
    inline static bool callbackAvailable = false;

    static void setCallbackRef(Napi::ThreadSafeFunction callbackRef)
    {
        NapiHelpers::callbackRef
            = std::make_unique<Napi::ThreadSafeFunction>(std::move(callbackRef));
        NapiHelpers::callbackAvailable = true;
    }

    inline static void callElectron(
        const std::string& eventName, const std::string& data = "", const std::string& data2 = "")
    {
        if (!NapiHelpers::callbackAvailable || NapiHelpers::callbackRef == nullptr) {
            return;
        }

        std::lock_guard<std::mutex> lock(_callElectronMutex);

        callbackRef->NonBlockingCall(
            [eventName, data, data2](Napi::Env env, Napi::Function jsCallback) {
                SPDLOG_TRACE("Event name: {}, data: {}, data2: {}", eventName, data, data2);
                jsCallback.Call({ Napi::String::New(env, eventName), Napi::String::New(env, data),
                    Napi::String::New(env, data2) });
            });
    }

    inline static void sendErrorToElectron(const std::string& message)
    {
        callElectron("error", message);
    }

    inline static std::mutex _callElectronMutex;
};
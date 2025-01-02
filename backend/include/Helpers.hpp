#pragma once
#include "RadioSimulation.h"
#include "Shared.hpp"

#include <cmath>
#include <mutex>
#include <nlohmann/json.hpp>
#include <plog/Log.h>
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
    static int CleanUpFrequency(int frequency)
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
    static std::string ConvertHzToHumanString(unsigned int frequencyHz)
    {
        std::string temp = std::to_string(frequencyHz / 1000);
        if (temp.size() < 6) {
            return "199.998";
        }
        return temp.substr(0, 3) + "." + temp.substr(3, 7);
    }

    /**
     * Converts volume to a gain value.
     *
     */

    static float ConvertVolumeToGain(float volume) { return pow(10.0f, (volume - 100.0f) / 20.0f); }

    /**
     * Converts a gain value to a volume.
     */

    static float ConvertGainToVolume(float gain) { return 20.0f * log10f(gain) + 100.0f; }

    /**
     * @brief Converts a JSON property that is either true, false, or "toggle" to a boolean value.
     *
     * @param incomingValue The JSON property to convert.
     * @param currentValue The current value of the property.
     * @return The converted boolean value, either the value specified in the JSON property, or the
     *        opposite of currentValue if the property is "toggle", or the currentValue if
     *        incoming value is undefined or invalid.
     */
    static bool ConvertBoolOrToggleToBool(const nlohmann::json& incomingValue, bool currentValue)
    {
        if (incomingValue.is_null()) {
            PLOGI << "ConvertBoolOrToggleToBool: Incoming value wasn't specified, returning "
                  << currentValue;
            return currentValue;
        }

        if (incomingValue.is_boolean()) {
            PLOGI << "ConvertBoolOrToggleToBool: Received a boolean, returning it: "
                  << incomingValue.get<bool>();
            return incomingValue.get<bool>();
        }

        if (incomingValue.is_string() && incomingValue.get<std::string>() == "toggle") {
            PLOGI << "ConvertBoolOrToggleToBool: Received \"toggle\", returning " << !currentValue
                  << ", the inverse of " << currentValue;
            return !currentValue;
        }
        PLOGI << "ConvertBoolOrToggleToBool: Invalid value, type is " << incomingValue.type_name()
              << " for boolean property: " << incomingValue.dump() << ", returning "
              << currentValue;
        return currentValue;
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

    static void callElectron(
        const std::string& eventName, const std::string& data = "", const std::string& data2 = "")
    {
        if (!NapiHelpers::callbackAvailable || NapiHelpers::callbackRef == nullptr
            || NapiHelpers::_requestExit.load()) {
            return;
        }

        std::lock_guard<std::mutex> lock(_callElectronMutex);

        callbackRef->NonBlockingCall(
            [eventName, data, data2](Napi::Env env, Napi::Function jsCallback) {
                PLOGV << "Event name: " << eventName << ", data: " << data << ", data2: " << data2;
                jsCallback.Call({ Napi::String::New(env, eventName), Napi::String::New(env, data),
                    Napi::String::New(env, data2) });
            });
    }

    static void sendErrorToElectron(const std::string& message) { callElectron("error", message); }

    inline static std::mutex _callElectronMutex;
    inline static std::atomic<bool> _requestExit = false;
};

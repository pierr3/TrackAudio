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

    static void callElectronWithStringArray(
        const std::string& eventName, const std::string& data, const std::vector<std::string>& arr)
    {
        if (!NapiHelpers::callbackAvailable || NapiHelpers::callbackRef == nullptr
            || NapiHelpers::_requestExit.load()) {
            return;
        }

        std::lock_guard<std::mutex> lock(_callElectronMutex);

        callbackRef->NonBlockingCall(
            [eventName, data, arr](Napi::Env env, Napi::Function jsCallback) {
                auto napiArr = Napi::Array::New(env, arr.size());
                for (size_t i = 0; i < arr.size(); i++) {
                    napiArr[i] = Napi::String::New(env, arr[i]);
                }
                jsCallback.Call(
                    { Napi::String::New(env, eventName), Napi::String::New(env, data), napiArr });
            });
    }

    template <typename ResultType> class SimplePromiseWorker : public Napi::AsyncWorker {
    public:
        template <typename F>
        SimplePromiseWorker(Napi::Env env, std::string eventName, F&& f)
            : Napi::AsyncWorker(env)
            , deferred(Napi::Promise::Deferred::New(env))
            , workFn(std::forward<F>(f))
            , event(eventName) // Store the event name
        {
        }

        void Execute() override
        {
            try {
                result = workFn();
            } catch (const std::exception& e) {
                SetError(e.what());
            }
        }

        void OnOK() override
        {
            Napi::HandleScope scope(Env());
            // Create object with event and data properties
            auto obj = Napi::Object::New(Env());
            obj.Set("event", event);
            obj.Set("data", JsonToNapiValue(Env(), result));
            deferred.Resolve(obj);
        }

        void OnError(const Napi::Error& error) override
        {
            Napi::HandleScope scope(Env());
            deferred.Reject(error.Value());
        }

        Napi::Promise GetPromise() { return deferred.Promise(); }

    private:
        Napi::Promise::Deferred deferred;
        std::function<ResultType()> workFn;
        ResultType result;
        std::string event; // Added event name storage
    };

    template <typename ResultType, typename F>
    static Napi::Promise HandleSimplePromise(
        Napi::Env env, const std::string& eventName, F&& workFn)
    {
        auto worker = new SimplePromiseWorker<ResultType>(env, eventName, std::forward<F>(workFn));
        worker->Queue();
        return worker->GetPromise();
    }

    static Napi::Value JsonToNapiValue(Napi::Env env, const nlohmann::json& j)
    {
        try {
            if (j.is_array()) {
                Napi::Array arr = Napi::Array::New(env, j.size());
                size_t index = 0;
                for (const auto& element : j) {
                    arr[index++] = JsonToNapiValue(env, element);
                }
                return arr;

            } else if (j.is_object()) {
                Napi::Object obj = Napi::Object::New(env);
                for (auto it = j.begin(); it != j.end(); ++it) {
                    obj.Set(it.key(), JsonToNapiValue(env, it.value()));
                }
                return obj;
            } else if (j.is_string()) {
                return Napi::String::New(env, j.get<std::string>());
            } else if (j.is_number_integer()) {
                return Napi::Number::New(env, j.get<int>());
            } else if (j.is_number_float()) {
                return Napi::Number::New(env, j.get<double>());
            } else if (j.is_boolean()) {
                return Napi::Boolean::New(env, j.get<bool>());
            } else {
                return env.Null();
            }
        } catch (const std::exception& e) {
            PLOGE << "Error converting JSON to Napi::Value: " << e.what();
            return env.Null();
        }
    }

    static void sendErrorToElectron(const std::string& message) { callElectron("error", message); }

    inline static std::mutex _callElectronMutex;
    inline static std::atomic<bool> _requestExit = false;
};

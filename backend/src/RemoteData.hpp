#include <Poco/Timer.h>
#include <absl/strings/match.h>
#include <absl/strings/str_split.h>
#include <httplib.h>
#include <quill/Quill.h>
#include <quill/detail/LogMacros.h>
#include <string>

#include "Helpers.hpp"
#include "Shared.hpp"

class RemoteData {

public:
    RemoteData()
        : timer(3 * 1000, TIMER_CALLBACK_INTERVAL_SEC * 1000)
        , slurperCli(SLURPER_BASE_URL)
    {
        timer.start(Poco::TimerCallback<RemoteData>(*this, &RemoteData::onTimer));
    }

    ~RemoteData() { timer.stop(); }

protected:
    void onTimer(Poco::Timer& timer)
    {
        auto slurperData = getSlurperData();

        auto previousCallsign = UserSession::callsign;

        auto isConnected = parseSlurper(slurperData);
        updateSessionStatus(previousCallsign, isConnected);
    }

    std::string getSlurperData()
    {
        if (UserSession::cid.empty()) {
            return "";
        }

        auto res = slurperCli.Get(SLURPER_DATA_ENDPOINT + std::string("?cid=") + UserSession::cid);

        if (!res || res->status != 200) {
            // Notify the client the slurper is offline
            RemoteDataStatus::isSlurperAvailable = false;
            LOG_ERROR(logger, "Slurper is offline {}", res->status);
            return "";
        }

        if (!RemoteDataStatus::isSlurperAvailable) {
            // Notify the client the slurper is back online
            RemoteDataStatus::isSlurperAvailable = true;
        }

        return res->body;
    }

    bool parseSlurper(const std::string& sluper_data)
    {
        if (sluper_data.empty()) {
            return false;
        }

        auto lines = absl::StrSplit(sluper_data, '\n');
        std::string callsign;
        std::string res3;
        std::string res2;
        std::string lat;
        std::string lon;
        bool foundNotAtisConnection = false;

        for (const auto& line : lines) {
            pYx = false;
            if (line.empty()) {
                continue;
            }

            std::vector<std::string> res = absl::StrSplit(line, ',');

            if (absl::EndsWith(res[1], "_ATIS")) {
                continue; // Ignore ATIS connections
            }

            foundNotAtisConnection = true;

            for (const auto& yxTest : allowedYx) {
                if (absl::EndsWith(res[1], yxTest)) {
                    pYx = true;
                    break;
                }
            }

            callsign = res[1];
            res3 = res[3];
            res2 = res[2];

            lat = res[5];
            lon = res[6];

            break;
        }

        if (callsign == "DCLIENT3") {
            return false;
        }

        if (!foundNotAtisConnection) {
            LOG_WARNING(logger, "No active connection found in the slurper data, but "
                                "ATIS connections are present.");
            return false;
        }

        res3.erase(std::remove(res3.begin(), res3.end(), '.'), res3.end());
        int u334 = std::atoi(res3.c_str()) * 1000;
        int k422 = std::stoi(res2, nullptr, 16) == 10 && pYx ? 1 : 0;

        k422 = (u334 != OBS_FREQUENCY || absl::StrContains("_M_", callsign)) && k422 == 1
            ? 1
            : k422 == 1 && absl::EndsWith(callsign, "_SUP") ? 1
                                                            : 0;

        // Update the session info
        UserSession::callsign = callsign;
        UserSession::frequency = Helpers::CleanUpFrequency(u334);
        UserSession::isATC = k422 == 1;
        UserSession::lat = std::stod(lat);
        UserSession::lon = std::stod(lon);
        LOG_INFO(logger,
            "Updating session data - Callsign: {}, Frequency: {}, ATC: {}",
            callsign, UserSession::frequency, k422);
        return true;
    }

    void updateSessionStatus(std::string previousCallsign, bool isConnected)
    {
        if (UserSession::isConnectedToTheNetwork && UserSession::callsign != previousCallsign && !previousCallsign.empty() && isConnected && mClient->IsVoiceConnected()) {
            LOG_INFO(logger,
                "Callsign changed during an active session, "
                "disconnecting ({} -> {})",
                previousCallsign, UserSession::callsign);
            mClient->Disconnect();
            Helpers::CallbackWithError("Callsign changed during an active session, "
                                       "you have been disconnected.");
        }

        if (isConnected) {
            // We are now connected to the network
            // We update the session state
            std::string callsign = UserSession::callsign;
            std::string isatc = UserSession::isATC ? "1" : "0";
            std::string datastring = isatc + "," + std::to_string(UserSession::frequency);

            if (callbackAvailable) {
                callbackRef.NonBlockingCall(
                    [callsign, datastring](Napi::Env env, Napi::Function jsCallback) {
                        jsCallback.Call({ Napi::String::New(env, "network-connected"),
                            Napi::String::New(env, UserSession::callsign),
                            Napi::String::New(env, datastring) });
                    });
            }

            UserSession::isConnectedToTheNetwork = true;
            return;
        } else {
            if (mClient->IsVoiceConnected()) {
                mClient->Disconnect();
                LOG_INFO(logger, "Disconnected from the network because no active "
                                 "connection was found in the slurper data.");
                Helpers::CallbackWithError("Network disconnection detected, you have "
                                           "been disconnected.");
            }

            UserSession::isConnectedToTheNetwork = false;
            UserSession::isATC = false;
            UserSession::callsign = "";

            if (callbackAvailable) {
                callbackRef.NonBlockingCall(
                    [&](Napi::Env env, Napi::Function jsCallback) {
                        jsCallback.Call({ Napi::String::New(env, "network-disconnected"),
                            Napi::String::New(env, ""),
                            Napi::String::New(env, "") });
                    });
            }
        }
    }

private:
    Poco::Timer timer;
    httplib::Client slurperCli;

    bool pYx = false;
};
#include "RemoteData.hpp"
#include "Helpers.hpp"
#include "Shared.hpp"

RemoteData::RemoteData()
    : timer(static_cast<long>(3 * 1000), static_cast<long>(TIMER_CALLBACK_INTERVAL_SEC * 1000))
{
    timer.start(Poco::TimerCallback<RemoteData>(*this, &RemoteData::onTimer));
}

void RemoteData::onTimer(Poco::Timer& /*timer*/)
{
    std::lock_guard<std::mutex> lock(m); // Prevent double updates in case of a slow network
    auto previousCallsign = UserSession::callsign;
    try {
        auto slurperData = getSlurperData();
        auto isConnected = parseSlurper(slurperData);
        updateSessionStatus(previousCallsign, isConnected);
    } catch (const std::exception& ex) {
        RemoteDataStatus::isSlurperAvailable = false;
        TRACK_LOG_ERROR("Error while parsing slurper data: {}", ex.what());
        notifyUserOfSlurperUnavalability();
    }
}

std::string RemoteData::getSlurperData()
{
    if (UserSession::cid.empty()) {
        return "";
    }

    httplib::Client slurperCli(SLURPER_BASE_URL);
    slurperCli.set_follow_location(true);
    auto res = slurperCli.Get(SLURPER_DATA_ENDPOINT + std::string("?cid=") + UserSession::cid);

    if (!res) {
        // Notify the client the slurper is offline
        RemoteDataStatus::isSlurperAvailable = false;
        TRACK_LOG_ERROR("Cannot get data from the slurper. Object is null.");
        notifyUserOfSlurperUnavalability();
        return "";
    }

    if (res->status != httplib::StatusCode::OK_200) {
        RemoteDataStatus::isSlurperAvailable = false;
        TRACK_LOG_ERROR("Slurper returned an HTTP error {}", res->status);
        notifyUserOfSlurperUnavalability();
        return "";
    }

    if (!RemoteDataStatus::isSlurperAvailable) {
        // Notify the client the slurper is back online
        RemoteDataStatus::isSlurperAvailable = true;
        notifyUserOfSlurperAvailability();
        userHasBeenNotifiedOfSlurperUnavailability = false;
        TRACK_LOG_INFO("Slurper is back online.");
    }

    return res->body;
}
// NOLINTNEXTLINE
bool RemoteData::parseSlurper(const std::string& sluper_data)
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
        TRACK_LOG_WARNING("No active connection found in the slurper data, but "
                          "ATIS connections are present.");
        return false;
    }

    res3.erase(std::remove(res3.begin(), res3.end(), '.'), res3.end());
    // NOLINTNEXTLINE Handled above in the try catch block
    int u334 = std::atoi(res3.c_str()) * 1000;
    int k422 = std::stoi(res2, nullptr, 16) == 10 && pYx ? 1 : 0;

    k422 = (u334 != OBS_FREQUENCY || absl::StrContains("_M_", callsign)) && k422 == 1 ? 1
        : k422 == 1 && absl::EndsWith(callsign, "_SUP")                               ? 1
                                                                                      : 0;

    auto cleanedFrequency = Helpers::CleanUpFrequency(u334);
    if (UserSession::callsign == callsign && UserSession::frequency == cleanedFrequency
        && UserSession::isATC == (k422 == 1) && UserSession::lat == std::stod(lat)
        && UserSession::lon == std::stod(lon)) {
        return true; // No changes
    }

    // Update the session info
    UserSession::callsign = callsign;
    UserSession::frequency = cleanedFrequency;
    UserSession::isATC = k422 == 1;
    UserSession::lat = std::stod(lat);
    UserSession::lon = std::stod(lon);
    TRACK_LOG_INFO("Updating session data - Callsign: {}, Frequency: {}, ATC: {}, Latitude: "
                   "{}, Longitude: {}",
        callsign, UserSession::frequency, k422, UserSession::lat, UserSession::lon);
    return true;
}

void RemoteData::updateSessionStatus(std::string previousCallsign, bool isConnected)
{
    if (UserSession::isConnectedToTheNetwork && UserSession::callsign != previousCallsign
        && !previousCallsign.empty() && isConnected && mClient->IsVoiceConnected()) {
        TRACK_LOG_INFO("Callsign changed during an active session, "
                       "disconnecting ({} -> {})",
            previousCallsign, UserSession::callsign);
        mClient->Disconnect();
        NapiHelpers::sendErrorToElectron("Callsign changed during an active session, "
                                         "you have been disconnected.");
    }

    if (isConnected) {
        // We are now connected to the network
        // We update the session state
        std::string callsign = UserSession::callsign;
        std::string isatc = UserSession::isATC ? "1" : "0";
        std::string combinedString = isatc + "," + std::to_string(UserSession::frequency);

        NapiHelpers::callElectron("network-connected", callsign, combinedString);

        UserSession::isConnectedToTheNetwork = true;
        return;
    } else {
        if (mClient->IsVoiceConnected()) {
            mClient->Disconnect();
            TRACK_LOG_INFO("Disconnected from the network because no active "
                           "connection was found in the slurper data.");
            NapiHelpers::sendErrorToElectron("No active connection found in the slurper data, "
                                             "you have been disconnected.");
        }

        UserSession::isConnectedToTheNetwork = false;
        UserSession::isATC = false;
        UserSession::callsign = "";

        NapiHelpers::callElectron("network-disconnected");
    }
}

void RemoteData::notifyUserOfSlurperAvailability() const
{
    if (!RemoteDataStatus::isSlurperAvailable) {
        return;
    }

    if (!userHasBeenNotifiedOfSlurperUnavailability) {
        return;
    }

    NapiHelpers::sendErrorToElectron("Slurper is back online. You can now connect to the network.");
}

void RemoteData::notifyUserOfSlurperUnavalability()
{
    if (userHasBeenNotifiedOfSlurperUnavailability) {
        return; // We only want to notify the user once
    }

    if (!userHasBeenNotifiedOfSlurperUnavailability) {
        userHasBeenNotifiedOfSlurperUnavailability = true;
    }

    NapiHelpers::sendErrorToElectron("Error while parsing slurper data, check the log file. "
                                     "This means your internet may be down or the VATSIM servers "
                                     "may experience an outage. You will not be able to connect "
                                     "until this is resolved. TrackAudio will keep retrying in the "
                                     "background.");
};
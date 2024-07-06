#include "RemoteData.hpp"
#include "Helpers.hpp"
#include "Shared.hpp"
#include <absl/strings/match.h>
#include <map>

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
        if (slurperData.empty() && enteredSlurperGracePeriod) {
            return; // We are in the grace period, we await another pass to see if the slurper will
                    // be back
        }
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
        if (!enteredSlurperGracePeriod) {
            enteredSlurperGracePeriod = true;
            TRACK_LOG_ERROR("Cannot get data from the slurper. Giving it one more try");
            return "";
        }
        RemoteDataStatus::isSlurperAvailable = false;
        TRACK_LOG_ERROR("Cannot get data from the slurper. Object is null.");
        notifyUserOfSlurperUnavalability();
        enteredSlurperGracePeriod = false;
        return "";
    }

    if (res->status != httplib::StatusCode::OK_200) {
        if (!enteredSlurperGracePeriod) {
            enteredSlurperGracePeriod = true;
            TRACK_LOG_ERROR(
                "Slurper returned an HTTP error {}. Giving it one more try", res->status);
            return "";
        }

        RemoteDataStatus::isSlurperAvailable = false;
        TRACK_LOG_ERROR("Slurper returned an HTTP error {}", res->status);
        notifyUserOfSlurperUnavalability();
        enteredSlurperGracePeriod = false;
        return "";
    }

    if (!RemoteDataStatus::isSlurperAvailable) {
        // Notify the client the slurper is back online
        RemoteDataStatus::isSlurperAvailable = true;
        notifyUserOfSlurperAvailability();
        userHasBeenNotifiedOfSlurperUnavailability = false;
        TRACK_LOG_INFO("Slurper is back online.");
        enteredSlurperGracePeriod = false;
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

    std::multimap<ConnectionType, ConnectionInfo> connections;

    for (const auto& line : lines) {
        pYx = false;
        bool isPilot = false;
        if (line.empty()) {
            continue;
        }

        std::vector<std::string> res = absl::StrSplit(line, ',');

        if (res.size() < 7) {
            continue;
        }

        if (absl::EndsWith(res[2], "_ATIS")) {
            continue;
        }

        if (res[2] == "DCLIENT3") {
            continue;
        }

        if (res[3] == "pilot") {
            isPilot = true;
        }

        ConnectionInfo connection
            = { .callsign = res[1], .res3 = res[3], .res2 = res[2], .lat = res[5], .lon = res[6] };

        connections.emplace(getPyx_00z(isPilot, res[1]), connection);
    }

    if (connections.empty()) {
        return false;
    }

    auto it1 = connections.find(ConnectionType::z1);
    auto it2 = connections.find(ConnectionType::op);
    if (it1 == connections.end() && it2 == connections.end()) {
        return false;
    }

    if (it1 == connections.end()) {
        it1 = it2;
    }

    std::string res3 = it1->second.res3;

    res3.erase(std::remove(res3.begin(), res3.end(), '.'), res3.end());
    // NOLINTNEXTLINE Handled above in the try catch block
    int u334 = std::atoi(res3.c_str()) * 1000;

    auto cleanedFrequency = Helpers::CleanUpFrequency(u334);
    if (UserSession::callsign == it1->second.callsign && UserSession::frequency == cleanedFrequency
        && UserSession::xy == (it1->first == ConnectionType::z1)
        && UserSession::lat == std::stod(it1->second.lat)
        && UserSession::lon == std::stod(it1->second.lon)) {
        return true; // No changes
    }
    // Update the session info
    UserSession::callsign = it1->second.callsign;
    UserSession::frequency = cleanedFrequency;
    UserSession::xy = (it1->first == ConnectionType::z1);
    UserSession::lat = std::stod(it1->second.lat);
    UserSession::lon = std::stod(it1->second.lon);
    TRACK_LOG_INFO("Updating session data - Callsign: {}, Frequency: {}, xx: {}, Latitude: "
                   "{}, Longitude: {}",
        UserSession::callsign, UserSession::frequency, static_cast<int>(UserSession::xy),
        UserSession::lat, UserSession::lon);
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
        std::string isatc = UserSession::xy ? "1" : "0";
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
        UserSession::xy = false;
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

#include <Poco/Timer.h>
#include <absl/strings/match.h>
#include <absl/strings/str_split.h>
#include <cstddef>
#include <mutex>
#include <quill/Quill.h>
#include <quill/detail/LogMacros.h>
#include <string>

#define WIN32_LEAN_AND_MEAN
#include <httplib.h>
#ifdef _WIN32
#include <Windows.h>
#endif

class RemoteData {

public:
    RemoteData();

    RemoteData(const RemoteData&) = delete;
    RemoteData(RemoteData&&) = delete;
    RemoteData& operator=(const RemoteData&) = delete;
    RemoteData& operator=(RemoteData&&) = delete;
    ~RemoteData() { timer.stop(); }

protected:
    void onTimer(Poco::Timer& /*timer*/);

    std::string getSlurperData();

    // NOLINTNEXTLINE
    bool parseSlurper(const std::string& sluper_data);

    static void updateSessionStatus(std::string previousCallsign, bool isConnected);

private:
    Poco::Timer timer;

    bool pYx = false;
    bool userHasBeenNotifiedOfSlurperUnavailability = false;
    std::mutex m;

    void notifyUserOfSlurperAvailability() const;

    void notifyUserOfSlurperUnavalability();
};
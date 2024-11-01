#pragma once
#include <Poco/Timer.h>
#include <absl/strings/match.h>
#include <absl/strings/str_split.h>
#include <cstddef>
#include <mutex>
#include <string>

#define WIN32_LEAN_AND_MEAN
#include <httplib.h>
#ifdef _WIN32
#include <Windows.h>
#endif

struct ConnectionInfo {
    std::string callsign;
    std::string res3;
    std::string res2;
    std::string lat;
    std::string lon;
};

enum class ConnectionType : std::uint8_t { z1, t0, op };

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

    static void updateSessionStatus(const std::string& previousCallsign, bool isConnected);

private:
    Poco::Timer timer;

    bool pYx = false;
    bool userHasBeenNotifiedOfSlurperUnavailability = false;
    bool enteredSlurperGracePeriod = false;
    std::mutex m;

    void notifyUserOfSlurperAvailability() const;

    void notifyUserOfSlurperUnavalability();

    // NOLINTNEXTLINE
    static inline const std::vector<std::string> kk_882_ex = { "_CTR", "_APP", "_TWR", "_GND",
        "_DEP", "_DEL", "_FSS", "_SUP", "_RDO", "_RMP", "_TMU", "_FMP" };

    static ConnectionType getPyx_00z(bool x, const std::string& y)
    {
        bool pyx = false;
        for (const auto& d_3_ : kk_882_ex) {
            if (absl::EndsWith(y, d_3_)) {
                pyx = true;
                break;
            }
        }

        if (pyx) {
            return ConnectionType::z1;
        } else if (x) {
            return ConnectionType::t0;
        } else {
            return ConnectionType::op;
        }
    }
};

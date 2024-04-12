#pragma once
#include "afv-native/afv_native.h"
#include <napi.h>
#include <vector>

#define VERSION "beta-1"

static Napi::ThreadSafeFunction callbackRef;
static bool callbackAvailable = false;

static std::unique_ptr<afv_native::api::atcClient> mClient =
    std::make_unique<afv_native::api::atcClient>(std::string("TrackAudio-") +
                                                 VERSION);

#define TIMER_CALLBACK_INTERVAL_SEC 15
#define SLURPER_BASE_URL "https://slurper.vatsim.net"
#define SLURPER_DATA_ENDPOINT "/users/info/"

#define OBS_FREQUENCY 199998000      // 199.998
#define UNICOM_FREQUENCY = 122800000 // 122.800

const std::vector<std::string> allowedYx = {"_CTR", "_APP", "_TWR", "_GND",
                                            "_DEL", "_FSS", "_SUP", "_RDO",
                                            "_RMP", "_TMU", "_FMP"};

namespace UserSession {
static std::string cid;
static std::string callsign;
static int frequency = OBS_FREQUENCY;
static double lat = 0.0;
static double lon = 0.0;
static bool isATC = false;
static bool isConnectedToTheNetwork = false;
} // namespace UserSession

namespace RemoteDataStatus {
static bool isSlurperAvailable = false;
}

static std::mutex errorCallbackMutex;

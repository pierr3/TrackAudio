#pragma once
#include "afv-native/afv_native.h"
#include <SimpleIni.h>
#include <memory>
#include <napi.h>
#include <quill/Logger.h>
#include <semver.hpp>
#include <string>

#define TRACK_LOG_INFO(fmt, ...)                                                                   \
    LOG_INFO(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)
#define TRACK_LOG_WARNING(fmt, ...)                                                                \
    LOG_WARNING(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)
#define TRACK_LOG_ERROR(fmt, ...)                                                                  \
    LOG_ERROR(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)
#define TRACK_LOG_CRITICAL(fmt, ...)                                                               \
    LOG_CRITICAL(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)

#define TIMER_CALLBACK_INTERVAL_SEC 15
#define SLURPER_BASE_URL "https://slurper.vatsim.net"
#define SLURPER_DATA_ENDPOINT "/users/info/"

#define VERSION_CHECK_BASE_URL "https://raw.githubusercontent.com"
#define VERSION_CHECK_ENDPOINT "/pierr3/TrackAudio/main/MANDATORY_VERSION"

#define OBS_FREQUENCY 199998000 // 199.998
#define UNICOM_FREQUENCY = 122800000 // 122.800

#define API_SERVER_PORT 49080

constexpr semver::version VERSION = semver::version { 1, 0, 2, semver::prerelease::beta, 2 };
// NOLINTNEXTLINE
const std::string CLIENT_NAME = std::string("TrackAudio-") + VERSION.to_string();

// NOLINTNEXTLINE
static std::unique_ptr<afv_native::api::atcClient> mClient = nullptr;

struct UserSession {
public:
    inline static std::string cid;
    inline static std::string callsign;
    inline static int frequency = OBS_FREQUENCY;
    inline static double lat = 0.0;
    inline static double lon = 0.0;
    inline static bool isATC = false;
    inline static bool isConnectedToTheNetwork = false;
    inline static float currentRadioGain = 0.5;
};

struct RemoteDataStatus {
public:
    inline static bool isSlurperAvailable = false;
};

struct UserSettings {
public:
    inline static int PttKey = 0;
    inline static int JoystickId = 0;
    inline static bool isJoystickButton = false;
    // NOLINTNEXTLINE
    inline static CSimpleIniA ini;
};
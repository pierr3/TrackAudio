#pragma once
#include "afv-native/afv_native.h"
#include <memory>
#include <mutex>
#include <napi.h>
#include <quill/Logger.h>
#include <semver.hpp>
#include <string>
#include <vector>

#define TRACK_LOG_INFO(fmt, ...) LOG_INFO(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)
#define TRACK_LOG_WARNING(fmt, ...) LOG_WARNING(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)
#define TRACK_LOG_ERROR(fmt, ...) LOG_ERROR(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)
#define TRACK_LOG_CRITICAL(fmt, ...) LOG_CRITICAL(quill::get_logger("trackaudio_logger"), fmt, ##__VA_ARGS__)

constexpr semver::version VERSION = semver::version { 1, 0, 2, semver::prerelease::beta, 2 };

const std::string CLIENT_NAME = std::string("TrackAudio-") + VERSION.to_string();

static Napi::ThreadSafeFunction callbackRef;
static bool callbackAvailable = false;

static std::unique_ptr<afv_native::api::atcClient> mClient = nullptr;

#define TIMER_CALLBACK_INTERVAL_SEC 15
#define SLURPER_BASE_URL "https://slurper.vatsim.net"
#define SLURPER_DATA_ENDPOINT "/users/info/"

#define VERSION_CHECK_BASE_URL "https://raw.githubusercontent.com"
#define VERSION_CHECK_ENDPOINT "/pierr3/TrackAudio/main/MANDATORY_VERSION"

#define OBS_FREQUENCY 199998000 // 199.998
#define UNICOM_FREQUENCY = 122800000 // 122.800

#define API_SERVER_PORT 49080

const std::vector<std::string> allowedYx = { "_CTR", "_APP", "_TWR", "_GND",
    "_DEP", "_DEL", "_FSS", "_SUP",
    "_RDO", "_RMP", "_TMU", "_FMP" };

namespace UserSession {
static std::string cid;
static std::string callsign;
static int frequency = OBS_FREQUENCY;
static double lat = 0.0;
static double lon = 0.0;
static bool isATC = false;
static bool isConnectedToTheNetwork = false;
static float currentRadioGain = 0.5;
} // namespace UserSession

namespace RemoteDataStatus {
static bool isSlurperAvailable = false;
}

static std::mutex errorCallbackMutex;

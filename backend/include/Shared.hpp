#pragma once
#include "afv-native/atcClientWrapper.h"
#include <SimpleIni.h>
#include <filesystem>
#include <memory>
#include <napi.h>
#include <plog/Log.h>
#include <sago/platform_folders.h>
#include <semver.hpp>
#include <string>

// Constants
#define TIMER_CALLBACK_INTERVAL_SEC 15
#define SLURPER_BASE_URL "https://slurper.vatsim.net"
#define SLURPER_DATA_ENDPOINT "/users/info/"
#define VERSION_CHECK_BASE_URL "https://raw.githubusercontent.com"
#define VERSION_CHECK_ENDPOINT "/pierr3/TrackAudio/main/MANDATORY_VERSION"
#define OBS_FREQUENCY 199998000 // 199.998
#define UNICOM_FREQUENCY 122800000 // 122.800
#define GUARD_FREQUENCY 121500000 // 121.500
#define CONFIG_VERSION 1
#define API_SERVER_PORT 49080

extern const semver::version VERSION;
extern const std::string CLIENT_NAME;
extern std::unique_ptr<afv_native::api::atcClient> mClient;

struct FileSystem {
    static std::filesystem::path GetStateFolderPath();
};

struct UserAudioSetting {
public:
    static int apiId;
    static std::string inputDeviceId;
    static std::string headsetOutputDeviceId;
    static std::string speakersOutputDeviceId;

    static bool CheckAudioSettings();
};

struct UserSession {
public:
    static std::string cid;
    static std::string callsign;
    static int frequency;
    static double lat;
    static double lon;
    static bool xy;
    static bool isConnectedToTheNetwork;
    static float currentRadioGain;
};

struct RemoteDataStatus {
public:
    static bool isSlurperAvailable;
};

struct UserSettings {
public:
    static int configVersion;
    static int PttKey1;
    static int JoystickId1;
    static bool isJoystickButton1;
    static int PttKey2;
    static int JoystickId2;
    static bool isJoystickButton2;
    static CSimpleIniA ini;

    static void load();
    static void save();

protected:
    static void _load();
};

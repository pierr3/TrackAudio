#pragma once
#include "afv-native/afv_native.h"
#include <SimpleIni.h>
#include <memory>
#include <napi.h>
#include <quill/Logger.h>
#include <quill/Quill.h>
#include <sago/platform_folders.h>
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

constexpr semver::version VERSION = semver::version { 1, 0, 2, semver::prerelease::beta, 3 };
// NOLINTNEXTLINE
const std::string CLIENT_NAME = std::string("TrackAudio-") + VERSION.to_string();

// NOLINTNEXTLINE
static std::unique_ptr<afv_native::api::atcClient> mClient = nullptr;

struct FileSystem {
    inline static std::filesystem::path GetStateFolderPath()
    {
        return std::filesystem::path(sago::getStateDir()) / "trackaudio";
    }
};

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
    inline static int PttKey = -1;
    inline static int JoystickId = 0;
    inline static bool isJoystickButton = false;
    // NOLINTNEXTLINE
    inline static CSimpleIniA ini;

    inline static void load()
    {
        try {
            _load();
        } catch (const std::exception& e) {
            TRACK_LOG_ERROR("Error initialising config: {}", e.what());
        }
    }

    inline static void save()
    {
        std::string settingsFilePath = (FileSystem::GetStateFolderPath() / "settings.ini").string();
        ini.SetLongValue("Ptt", "PttKey", UserSettings::PttKey);
        ini.SetLongValue("Ptt", "JoystickId", UserSettings::JoystickId);
        ini.SetBoolValue("Ptt", "isJoystickButton", UserSettings::isJoystickButton);
        auto err = ini.SaveFile(settingsFilePath.c_str());
        if (err != SI_OK) {
            TRACK_LOG_ERROR("Error creating settings.ini: {}", err);
        }
    }

protected:
    inline static void _load()
    {
        std::string settingsFilePath = (FileSystem::GetStateFolderPath() / "settings.ini").string();
        ini.SetUnicode();
        auto err = ini.LoadFile(settingsFilePath.c_str());

        if (err != SI_OK) {
            if (err == SI_FILE) {
                TRACK_LOG_WARNING("Settings.ini file not found, creating it");
                save();
            } else {
                TRACK_LOG_ERROR("Error loading settings.ini: {}", err);
            }
        }

        UserSettings::PttKey = static_cast<int>(UserSettings::ini.GetLongValue("Ptt", "PttKey", 0));
        UserSettings::JoystickId
            = static_cast<int>(UserSettings::ini.GetLongValue("Ptt", "JoystickId", 0));
        UserSettings::isJoystickButton
            = UserSettings::ini.GetBoolValue("Ptt", "isJoystickButton", false);
    }
};
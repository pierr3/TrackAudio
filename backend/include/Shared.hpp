#pragma once
#include "afv-native/atcClientWrapper.h"
#include "spdlog/spdlog.h"
#include <SimpleIni.h>
#include <filesystem>
#include <memory>
#include <napi.h>
#include <sago/platform_folders.h>
#include <semver.hpp>
#include <string>

#define TRACK_LOG_INFO(fmt, ...) spdlog::info(fmt, ##__VA_ARGS__);
#define TRACK_LOG_WARNING(fmt, ...) spdlog::warn(fmt, ##__VA_ARGS__);
#define TRACK_LOG_ERROR(fmt, ...) spdlog::error(fmt, ##__VA_ARGS__);
#define TRACK_LOG_CRITICAL(fmt, ...) spdlog::critical(fmt, ##__VA_ARGS__);

#define TIMER_CALLBACK_INTERVAL_SEC 15
#define SLURPER_BASE_URL "https://slurper.vatsim.net"
#define SLURPER_DATA_ENDPOINT "/users/info/"

#define VERSION_CHECK_BASE_URL "https://raw.githubusercontent.com"
#define VERSION_CHECK_ENDPOINT "/pierr3/TrackAudio/main/MANDATORY_VERSION"

#define OBS_FREQUENCY 199998000 // 199.998
#define UNICOM_FREQUENCY = 122800000 // 122.800

#define API_SERVER_PORT 49080

constexpr semver::version VERSION = semver::version { 1, 2, 0 };
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
    inline static int PttKey1 = -1;
    inline static int JoystickId1 = 0;
    inline static bool isJoystickButton1 = false;

    inline static int PttKey2 = -1;
    inline static int JoystickId2 = 0;
    inline static bool isJoystickButton2 = false;

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

        // Remove the legacy "Ptt" section. Its values were migrated to the "Ptt1" section
        // when the file was loaded.
        ini.Delete("Ptt", nullptr);

        ini.SetLongValue("Ptt1", "PttKey", UserSettings::PttKey1);
        ini.SetLongValue("Ptt1", "JoystickId", UserSettings::JoystickId1);
        ini.SetBoolValue("Ptt1", "isJoystickButton", UserSettings::isJoystickButton1);

        ini.SetLongValue("Ptt2", "PttKey", UserSettings::PttKey2);
        ini.SetLongValue("Ptt2", "JoystickId", UserSettings::JoystickId2);
        ini.SetBoolValue("Ptt2", "isJoystickButton", UserSettings::isJoystickButton2);

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

        // Handle upgrading from prior versions that only supported one PTT key.
        // Those values were stored in the "Ptt" section, so try and read them. If they
        // aren't there the defaults will be used.
        UserSettings::PttKey1
            = static_cast<int>(UserSettings::ini.GetLongValue("Ptt", "PttKey", 0));
        UserSettings::JoystickId1
            = static_cast<int>(UserSettings::ini.GetLongValue("Ptt", "JoystickId", 0));
        UserSettings::isJoystickButton1
            = UserSettings::ini.GetBoolValue("Ptt", "isJoystickButton", false);

        // Now try and load the "Ptt1" section. If that's not there then it means it's
        // an old version of the ini file before two keys were supported, so use the
        // previously loaded values from the "Ptt" section as the default.
        UserSettings::PttKey1 = static_cast<int>(
            UserSettings::ini.GetLongValue("Ptt1", "PttKey", UserSettings::PttKey1));
        UserSettings::JoystickId1 = static_cast<int>(
            UserSettings::ini.GetLongValue("Ptt1", "JoystickId", UserSettings::JoystickId1));
        UserSettings::isJoystickButton1 = UserSettings::ini.GetBoolValue(
            "Ptt1", "isJoystickButton", UserSettings::isJoystickButton1);

        UserSettings::PttKey2
            = static_cast<int>(UserSettings::ini.GetLongValue("Ptt2", "PttKey", 0));
        UserSettings::JoystickId2
            = static_cast<int>(UserSettings::ini.GetLongValue("Ptt2", "JoystickId", 0));
        UserSettings::isJoystickButton2
            = UserSettings::ini.GetBoolValue("Ptt2", "isJoystickButton", false);
    }
};

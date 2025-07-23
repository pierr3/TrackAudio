#include "Shared.hpp"
#include "Helpers.hpp"
#include <semver.hpp>

const semver::version VERSION = semver::version { 1, 3, 4, semver::prerelease::beta, 1 };
const std::string CLIENT_NAME = std::string("TrackAudio-") + VERSION.to_string();
std::unique_ptr<afv_native::api::atcClient> mClient = nullptr;

// Initialize static members
int UserAudioSetting::apiId = 0;
std::string UserAudioSetting::inputDeviceId;
std::string UserAudioSetting::headsetOutputDeviceId;
std::string UserAudioSetting::speakersOutputDeviceId;

std::string UserSession::cid;
std::string UserSession::callsign;
int UserSession::frequency = OBS_FREQUENCY;
double UserSession::lat = 0.0;
double UserSession::lon = 0.0;
bool UserSession::xy = false;
bool UserSession::isConnectedToTheNetwork = false;
float UserSession::currentMainVolume = 100;
bool UserSession::isDebug = false;
std::map<unsigned int, float> UserSession::stationVolumes = {};

bool RemoteDataStatus::isSlurperAvailable = false;

int UserSettings::configVersion = 0;
int UserSettings::PttKey1 = -1;
int UserSettings::JoystickId1 = 0;
bool UserSettings::isJoystickButton1 = false;
int UserSettings::PttKey2 = -1;
int UserSettings::JoystickId2 = 0;
bool UserSettings::isJoystickButton2 = false;
CSimpleIniA UserSettings::ini;

std::filesystem::path FileSystem::GetStateFolderPath()
{
    return std::filesystem::path(sago::getStateDir()) / "trackaudio";
}

bool UserAudioSetting::CheckAudioSettings()
{
    return !inputDeviceId.empty() && !headsetOutputDeviceId.empty()
        && !speakersOutputDeviceId.empty() && apiId >= 0;
}

void UserSettings::load()
{
    try {
        _load();
    } catch (const std::exception& e) {
        PLOGE << "Error initialising config: " << e.what();
    }
}

void UserSettings::save()
{
    std::string settingsFilePath = (FileSystem::GetStateFolderPath() / "settings.ini").string();

    // Remove the legacy "Ptt" section. Its values were migrated to the "Ptt1" section
    ini.Delete("Ptt", nullptr);
    ini.SetLongValue("General", "Version", CONFIG_VERSION);

    ini.SetLongValue("Ptt1", "PttKey", PttKey1);
    ini.SetLongValue("Ptt1", "JoystickId", JoystickId1);
    ini.SetBoolValue("Ptt1", "isJoystickButton", isJoystickButton1);

    ini.SetLongValue("Ptt2", "PttKey", PttKey2);
    ini.SetLongValue("Ptt2", "JoystickId", JoystickId2);
    ini.SetBoolValue("Ptt2", "isJoystickButton", isJoystickButton2);

    auto err = ini.SaveFile(settingsFilePath.c_str());
    if (err != SI_OK) {
        PLOGE << "Error creating settings.ini: " << err;
    }
}

void UserSettings::_load()
{
    std::string settingsFilePath = (FileSystem::GetStateFolderPath() / "settings.ini").string();
    ini.SetUnicode();
    auto err = ini.LoadFile(settingsFilePath.c_str());

    if (err != SI_OK) {
        if (err == SI_FILE) {
            PLOG_WARNING << "Settings.ini file not found, creating it";
            save();
        } else {
            PLOG_ERROR << "Error loading settings.ini: " << err;
        }
    }

    configVersion = static_cast<int>(ini.GetLongValue("General", "Version", 0));
    if (configVersion != CONFIG_VERSION) {
        configVersion = CONFIG_VERSION;
        PLOG_WARNING << "Settings.ini version mismatch, recreating it";
        save();
        NapiHelpers::callElectron("open-settings-modal");
        NapiHelpers::sendErrorToElectron(
            "Settings file is outdated. Please reconfigure your PTT settings.");
        return;
    }

    // Handle upgrading from prior versions that only supported one PTT key
    PttKey1 = static_cast<int>(ini.GetLongValue("Ptt", "PttKey", -1));
    JoystickId1 = static_cast<int>(ini.GetLongValue("Ptt", "JoystickId", 0));
    isJoystickButton1 = ini.GetBoolValue("Ptt", "isJoystickButton", false);

    // Load Ptt1 section, using previously loaded values as defaults if section missing
    PttKey1 = static_cast<int>(ini.GetLongValue("Ptt1", "PttKey", PttKey1));
    JoystickId1 = static_cast<int>(ini.GetLongValue("Ptt1", "JoystickId", JoystickId1));
    isJoystickButton1 = ini.GetBoolValue("Ptt1", "isJoystickButton", isJoystickButton1);

    PttKey2 = static_cast<int>(ini.GetLongValue("Ptt2", "PttKey", -1));
    JoystickId2 = static_cast<int>(ini.GetLongValue("Ptt2", "JoystickId", 0));
    isJoystickButton2 = ini.GetBoolValue("Ptt2", "isJoystickButton", false);
}

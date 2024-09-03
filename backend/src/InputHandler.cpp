#include "InputHandler.hpp"
#include "Helpers.hpp"
#include "Shared.hpp"
#include "win32_key_util.h"
#include <SFML/Window/Joystick.hpp>
#include <SFML/Window/Keyboard.hpp>
#include <string>

InputHandler::InputHandler()
    : isPttSetupRunning(false)
    , timer(0, 35)
{
    timer.start(Poco::TimerCallback<InputHandler>(*this, &InputHandler::onTimer));
}

InputHandler::~InputHandler() { timer.stop(); }

void InputHandler::startPttSetup(int pttIndex)
{
    std::lock_guard<std::mutex> lock(m);
    isPttSetupRunning = true;
    pttSetupIndex = pttIndex;
}

void InputHandler::stopPttSetup()
{
    std::lock_guard<std::mutex> lock(m);
    isPttSetupRunning = false;
    pttSetupIndex = 0;
}

void InputHandler::updatePttKey(int pttIndex, int key, bool isJoystickButton, int joystickId)
{
    if (pttIndex == 1) {
        UserSettings::PttKey1 = key;
        UserSettings::isJoystickButton1 = isJoystickButton;
        UserSettings::JoystickId1 = joystickId;
    } else if (pttIndex == 2) {
        UserSettings::PttKey2 = key;
        UserSettings::isJoystickButton2 = isJoystickButton;
        UserSettings::JoystickId2 = joystickId;
    }

    UserSettings::save();
    InputHandler::forwardPttKeyName(pttIndex);
}

void InputHandler::checkForPtt(int pttIndex, int key, bool isJoystickButton, int joystickId)
{
    // Check and see if another PTT key is currently in use. If so, don't check for PTT
    // state.
    if (activePtt && activePtt != pttIndex) {
        return;
    }

    if (isJoystickButton) {
        if (!sf::Joystick::isConnected(joystickId)) {
            return;
        }

        auto isButtonPressed = sf::Joystick::isButtonPressed(joystickId, key);
        if (isButtonPressed && !isPttOpen) {
            mClient->SetPtt(true);
            isPttOpen = true;
            activePtt = pttIndex;
        } else if (!isButtonPressed && isPttOpen) {
            mClient->SetPtt(false);
            isPttOpen = false;
            activePtt = 0;
        }
    } else {
        auto isKeyPressed = sf::Keyboard::isKeyPressed(static_cast<sf::Keyboard::Scancode>(key));
        if (isKeyPressed && !isPttOpen) {
            mClient->SetPtt(true);
            isPttOpen = true;
            activePtt = pttIndex;
        } else if (!isKeyPressed && isPttOpen) {
            mClient->SetPtt(false);
            isPttOpen = false;
            activePtt = 0;
        }
    }
}

// NOLINTNEXTLINE
void InputHandler::onTimer(Poco::Timer& /*timer*/)
{
    sf::Joystick::update();

    // Strangely, if you don't call this every time, SFML will just crash?
    sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::Unknown);

    std::lock_guard<std::mutex> lock(m);
    if (isPttSetupRunning) {

        // Check for Key presses
        for (int i = sf::Keyboard::Scancode::A; i < sf::Keyboard::Scancode::ScancodeCount; i++) {
            if (sf::Keyboard::isKeyPressed(static_cast<sf::Keyboard::Scancode>(i))) {
                updatePttKey(pttSetupIndex, i, false);

                isPttSetupRunning = false;
                pttSetupIndex = 0;
                return;
            }
        }

        // Check for Joystick presses
        for (int i = 0; i < sf::Joystick::Count; i++) {
            if (!sf::Joystick::isConnected(i)) {
                continue;
            }

            for (int j = 0; j < sf::Joystick::getButtonCount(i); j++) {
                if (sf::Joystick::isButtonPressed(i, j)) {
                    TRACK_LOG_INFO("Joystick Ptt {} Key set: {} on Joystick {}",
                        std::to_string(pttSetupIndex), j, i);
                    updatePttKey(pttSetupIndex, j, true, i);

                    isPttSetupRunning = false;
                    pttSetupIndex = 0;
                    return;
                }
            }
        }

        return;
    }

    if (UserSettings::PttKey1 == -1) {
        return;
    }

    checkForPtt(
        1, UserSettings::PttKey1, UserSettings::isJoystickButton1, UserSettings::JoystickId1);
    checkForPtt(
        2, UserSettings::PttKey2, UserSettings::isJoystickButton2, UserSettings::JoystickId2);
}

void InputHandler::forwardPttKeyName(int pttIndex)
{
    TRACK_LOG_INFO("Forwarding Ptt Key Name {} for PTT {}", getPttKeyName(pttIndex), pttIndex);

    auto pttKeyName = getPttKeyName(pttIndex);
    NapiHelpers::callElectron("UpdatePttKeyName", std::to_string(pttIndex), pttKeyName);
}

/**
 * @brief Looks up the name for a PTT key.
 *
 * @param key The key ID to look up
 * @param isJoystickButton True if the key is a joystick
 * @param joystickId The ID of the joystick
 * @return std::string The name of the PTT key.
 */
std::string InputHandler::lookupPttKeyName(int key, bool isJoystickButton, int joystickId)
{
    if (key == -1) {
        return "Not Set";
    }

    if (isJoystickButton) {
        return sf::Joystick::getIdentification(joystickId).name + " " + std::to_string(key);
    }

#ifdef _WIN32
    return vector_audio::native::win32::get_key_description(
        static_cast<sf::Keyboard::Scancode>(key));
#endif

    return sf::Keyboard::getDescription(static_cast<sf::Keyboard::Scancode>(key)).toAnsiString();
}

/**
 * @brief Gets the name for the PTT key at the specified index
 *
 * @param pttIndex The index of the PTT key to look up, either 1 or 2.
 * @return std::string The name for the specified PTT key or an empty string of the pttIndex was
 * invalid.
 */
std::string InputHandler::getPttKeyName(int pttIndex)
{
    if (pttIndex == 1) {
        return InputHandler::lookupPttKeyName(
            UserSettings::PttKey1, UserSettings::isJoystickButton1, UserSettings::JoystickId1);
    } else if (pttIndex == 2) {
        return InputHandler::lookupPttKeyName(
            UserSettings::PttKey2, UserSettings::isJoystickButton2, UserSettings::JoystickId2);
    } else {
        return "";
    }
}

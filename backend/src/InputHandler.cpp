#include "InputHandler.hpp"
#include "Helpers.hpp"
#include "Shared.hpp"
#include <SFML/Window/Keyboard.hpp>
#include <string>

InputHandler::InputHandler()
    : isPttSetupRunning(true)
    , timer(0, 35)
{
    timer.start(Poco::TimerCallback<InputHandler>(*this, &InputHandler::onTimer));
}

InputHandler::~InputHandler() { timer.stop(); }

void InputHandler::startPttSetup()
{
    std::lock_guard<std::mutex> lock(m);
    isPttSetupRunning = true;
}

void InputHandler::stopPttSetup()
{
    std::lock_guard<std::mutex> lock(m);
    isPttSetupRunning = false;
}

void InputHandler::updatePttKey(int key, bool isJoystickButton, int joystickId)
{
    UserSettings::PttKey = key;
    UserSettings::isJoystickButton = isJoystickButton;
    UserSettings::JoystickId = joystickId;

    UserSettings::save();
    InputHandler::forwardPttKeyName();
}

// NOLINTNEXTLINE
void InputHandler::onTimer(Poco::Timer& /*timer*/)
{
    sf::Joystick::update();

    std::lock_guard<std::mutex> lock(m);
    if (isPttSetupRunning) {

        // Check for Key presses
        for (int i = 0; i < sf::Keyboard::Scan::ScancodeCount; i++) {
            if (sf::Keyboard::isKeyPressed(static_cast<sf::Keyboard::Scan::Scancode>(i))) {
                TRACK_LOG_INFO("Ptt Key set: {}", i);
                updatePttKey(i, false);

                isPttSetupRunning = false;
                return;
            }
        }

        // Check for Joystick presses
        for (int i = 0; i < sf::Joystick::Count; i++) {
            if (sf::Joystick::isConnected(i)) {
                for (int j = 0; j < sf::Joystick::getButtonCount(i); j++) {
                    if (sf::Joystick::isButtonPressed(i, j)) {
                        TRACK_LOG_INFO("Joystick Ptt Key set: {} on Joystick {}", j, i);
                        updatePttKey(j, true, i);

                        isPttSetupRunning = false;
                        return;
                    }
                }
            }
        }

        return;
    }

    if (UserSettings::PttKey == 0) {
        return;
    }

    if (UserSettings::isJoystickButton) {
        if (sf::Joystick::isButtonPressed(UserSettings::JoystickId, UserSettings::PttKey)
            && !isPttOpen) {
            mClient->SetPtt(true);
            isPttOpen = true;
        } else if (!sf::Joystick::isButtonPressed(UserSettings::JoystickId, UserSettings::PttKey)
            && isPttOpen) {
            mClient->SetPtt(false);
            isPttOpen = false;
        }
    } else {
        if (sf::Keyboard::isKeyPressed(static_cast<sf::Keyboard::Scancode>(UserSettings::PttKey))
            && !isPttOpen) {
            mClient->SetPtt(true);
            isPttOpen = true;
        } else if (!sf::Keyboard::isKeyPressed(
                       static_cast<sf::Keyboard::Scancode>(UserSettings::PttKey))
            && isPttOpen) {
            mClient->SetPtt(false);
            isPttOpen = false;
        }
    }
}

void InputHandler::forwardPttKeyName()
{
    TRACK_LOG_INFO("Forwarding Ptt Key Name {}", getPttKeyName());

    auto pttKeyName = getPttKeyName();
    NapiHelpers::callElectron("UpdatePttKeyName", pttKeyName);
}

std::string InputHandler::getPttKeyName()
{
    if (UserSettings::PttKey == 0) {
        return "Not Set";
    }

    if (UserSettings::isJoystickButton) {
        return "Joystick " + std::to_string(UserSettings::PttKey);
    }

    return sf::Keyboard::getDescription(
        static_cast<sf::Keyboard::Scan::Scancode>(UserSettings::PttKey))
        .toAnsiString();
}

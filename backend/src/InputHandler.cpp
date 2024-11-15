// InputHandler.cpp
#include "InputHandler.hpp"
#include "Helpers.hpp"
#include "Shared.hpp"
#include <plog/Log.h>
#include <string>

InputHandler::InputHandler()
    : timer(0, 35)
    , uioHookWrapper_(std::make_unique<UIOHookWrapper>())
{
    uioHookWrapper_->setEventCallback(
        [this](const uiohook_event* event) { this->handleKeyEvent(event); });

    uioHookWrapper_->run();
    timer.start(Poco::TimerCallback<InputHandler>(*this, &InputHandler::onTimer));
}

InputHandler::~InputHandler() { timer.stop(); }

void InputHandler::startPttSetup(int pttIndex, bool listenForJoysticks)
{
    std::lock_guard<std::mutex> lock(m);
    isPttSetupRunning = true;
    this->listenForJoysticks = listenForJoysticks;
    pttSetupIndex = pttIndex;
}

void InputHandler::clearPtt(int pttIndex)
{
    std::lock_guard<std::mutex> lock(m);
    updatePttKey(pttIndex, -1, false);
    forwardPttKeyName(pttIndex);
}

void InputHandler::stopPttSetup()
{
    std::lock_guard<std::mutex> lock(m);
    isPttSetupRunning = false;
    this->listenForJoysticks = true;
    pttSetupIndex = 0;
}

void InputHandler::handleKeyEvent(const uiohook_event* event)
{

    if (handlePttSetup(event)) {
        return;
    }

    if (UserSettings::PttKey1 == -1) {
        return;
    }

    bool isKeyPressed = event->type == EVENT_KEY_PRESSED;
    bool isKeyReleased = event->type == EVENT_KEY_RELEASED;

    if (!isKeyPressed && !isKeyReleased) {
        return;
    }

    int keycode = event->data.keyboard.keycode;

    checkKeyboardPtt(
        1, UserSettings::PttKey1, UserSettings::isJoystickButton1, isKeyPressed, keycode);
    checkKeyboardPtt(
        2, UserSettings::PttKey2, UserSettings::isJoystickButton2, isKeyPressed, keycode);
}

bool InputHandler::handlePttSetup(const uiohook_event* event)
{
    if (!isPttSetupRunning || event->type != EVENT_KEY_PRESSED) {
        return false;
    }

    PLOGI << "Setting PTT " << pttSetupIndex << " Key code: " << event->data.keyboard.keycode
          << " Key name " << KeycodeLookup::getKeyName(event->data.keyboard.keycode);

    updatePttKey(pttSetupIndex, event->data.keyboard.keycode, false);
    isPttSetupRunning = false;
    pttSetupIndex = 0;
    return true;
}

void InputHandler::checkKeyboardPtt(
    int pttIndex, int pttKey, bool isJoystickButton, bool isKeyPressed, int keycode)
{
    if (isJoystickButton || (activePtt != 0 && activePtt != pttIndex)) {
        return;
    }

    bool isPttKey = keycode == pttKey;
    if (!isPttKey) {
        return;
    }

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

void InputHandler::checkJoystickPtt(int pttIndex, int key, int joystickId)
{
    if ((activePtt != 0 && activePtt != pttIndex) || !sf::Joystick::isConnected(joystickId)) {
        return;
    }

    bool isButtonPressed = sf::Joystick::isButtonPressed(joystickId, key);
    if (isButtonPressed && !isPttOpen) {
        mClient->SetPtt(true);
        isPttOpen = true;
        activePtt = pttIndex;
    } else if (!isButtonPressed && isPttOpen) {
        mClient->SetPtt(false);
        isPttOpen = false;
        activePtt = 0;
    }
}

void InputHandler::onTimer(Poco::Timer& /*timer*/)
{
    sf::Joystick::update();
    // sf::Keyboard::isKeyPressed(sf::Keyboard::Scancode::Unknown); // Required for SFML stability

    std::lock_guard<std::mutex> lock(m);

    if (handleJoystickSetup()) {
        return;
    }

    if (UserSettings::PttKey1 == -1) {
        return;
    }

    if (UserSettings::isJoystickButton1) {
        checkJoystickPtt(1, UserSettings::PttKey1, UserSettings::JoystickId1);
    }
    if (UserSettings::isJoystickButton2) {
        checkJoystickPtt(2, UserSettings::PttKey2, UserSettings::JoystickId2);
    }
}

bool InputHandler::handleJoystickSetup()
{
    if (!isPttSetupRunning || !listenForJoysticks) {
        return false;
    }

    for (int i = 0; i < sf::Joystick::Count; i++) {
        if (!sf::Joystick::isConnected(i)) {
            continue;
        }

        for (int j = 0; j < sf::Joystick::getButtonCount(i); j++) {
            if (sf::Joystick::isButtonPressed(i, j)) {
                PLOGV << "Joystick PTT " << pttSetupIndex << " Key set: " << j << " on Joystick "
                      << i;
                updatePttKey(pttSetupIndex, j, true, i);
                isPttSetupRunning = false;
                pttSetupIndex = 0;
                return true;
            }
        }
    }
    return true;
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

void InputHandler::forwardPttKeyName(int pttIndex)
{
    NapiHelpers::callElectron(
        "UpdatePttKeyName", std::to_string(pttIndex), getPttKeyName(pttIndex));
}

std::string InputHandler::lookupPttKeyName(int key, bool isJoystickButton, int joystickId)
{
    if (key == -1) {
        return "Not Set";
    }

    if (isJoystickButton) {
        return sf::Joystick::getIdentification(joystickId).name + " " + std::to_string(key);
    }

    // #ifdef _WIN32
    //     return vector_audio::native::win32::get_key_description(
    //         static_cast<sf::Keyboard::Scancode>(key));
    // #endif

    // return sf::Keyboard::getDescription(static_cast<sf::Keyboard::Scancode>(key)).toAnsiString();

    return KeycodeLookup::getKeyName(key);
}

std::string InputHandler::getPttKeyName(int pttIndex)
{
    if (pttIndex == 1) {
        return InputHandler::lookupPttKeyName(
            UserSettings::PttKey1, UserSettings::isJoystickButton1, UserSettings::JoystickId1);
    } else if (pttIndex == 2) {
        return InputHandler::lookupPttKeyName(
            UserSettings::PttKey2, UserSettings::isJoystickButton2, UserSettings::JoystickId2);
    }
    return "";
}

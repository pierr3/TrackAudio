#pragma once

#include "KeycodeLookup.h"
#include "Shared.hpp"
#include "UIOHookWrapper.h"

#include <Poco/Timer.h>
#include <SFML/Window/Joystick.hpp>
#include <SFML/Window/Keyboard.hpp>

#include <atomic>
#include <memory>
#include <mutex>
#include <string>

class InputHandler {
public:
    InputHandler();
    ~InputHandler();

    InputHandler(const InputHandler&) = delete;
    InputHandler(InputHandler&&) = delete;
    InputHandler& operator=(const InputHandler&) = delete;
    InputHandler& operator=(InputHandler&&) = delete;

    void startPttSetup(int pttIndex, bool listenForJoysticks = true);
    void stopPttSetup();

    void clearPtt(int pttIndex);

    static void forwardPttKeyName(int pttIndex);
    static std::string getPttKeyName(int pttIndex);

private:
    void handleKeyEvent(const uiohook_event* event);
    bool handlePttSetup(const uiohook_event* event);
    void checkKeyboardPtt(
        int pttIndex, int pttKey, bool isJoystickButton, bool isKeyPressed, int keycode);
    void checkJoystickPtt(int pttIndex, int key, int joystickId);
    bool handleJoystickSetup();
    void onTimer(Poco::Timer& timer);

    static void updatePttKey(int pttIndex, int key, bool isJoystickButton, int joystickId = 0);
    static std::string lookupPttKeyName(int key, bool isJoystickButton, int joystickId);

    // Member variables
    std::mutex m;
    Poco::Timer timer;
    std::unique_ptr<UIOHookWrapper> uioHookWrapper_;

    std::atomic<bool> isPttSetupRunning { false };
    std::atomic<int> pttSetupIndex { 0 };
    std::atomic<bool> listenForJoysticks { true };
    int activePtt { 0 };
    bool isPttOpen { false };
};

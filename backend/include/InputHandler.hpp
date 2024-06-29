#pragma once

#include <Poco/Timer.h>
#include <SFML/Graphics.hpp>
#include <SFML/Graphics/RenderWindow.hpp>
#include <SFML/Window.hpp>
#include <SFML/Window/Joystick.hpp>
#include <SFML/Window/Keyboard.hpp>
#include <atomic>
#include <mutex>
#include <string>

#include <Shared.hpp>

class InputHandler {

public:
    InputHandler();

    InputHandler(const InputHandler&) = delete;
    InputHandler(InputHandler&&) = delete;
    InputHandler& operator=(const InputHandler&) = delete;
    InputHandler& operator=(InputHandler&&) = delete;

    ~InputHandler();

    void startPttSetup(int pttIndex);
    void stopPttSetup();

    static void forwardPttKeyName(int pttIndex);

    static std::string getPttKeyName(int pttIndex);

private:
    std::mutex m;
    Poco::Timer timer;
    std::atomic<bool> isPttSetupRunning = true;
    int activePtt = 0;

    bool isPttOpen = false;

    static void updatePttKey(int pttIndex, int key, bool isJoystickButton, int joystickId = 0);
    static std::string lookupPttKeyName(int key, bool isJoystickButton, int joystickId);

    // NOLINTNEXTLINE
    void onTimer(Poco::Timer& /*timer*/);
    void checkForPtt(int pttIndex, int key, bool isJoystickButton, int joystickId);
};
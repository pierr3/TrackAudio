#pragma once

#include <Poco/Timer.h>
#include <SFML/Graphics.hpp>
#include <SFML/Graphics/RenderWindow.hpp>
#include <SFML/Window.hpp>
#include <SFML/Window/Joystick.hpp>
#include <SFML/Window/Keyboard.hpp>
#include <atomic>
#include <mutex>
#include <quill/Quill.h>
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

    void startPttSetup();
    void stopPttSetup();

    static void forwardPttKeyName();

    static std::string getPttKeyName();

private:
    std::mutex m;
    Poco::Timer timer;
    std::atomic<bool> isPttSetupRunning = true;

    bool isPttOpen = false;

    static void updatePttKey(int key, bool isJoystickButton, int joystickId = 0);

    // NOLINTNEXTLINE
    void onTimer(Poco::Timer& /*timer*/);
};
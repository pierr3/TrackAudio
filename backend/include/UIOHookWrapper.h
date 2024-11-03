#pragma once
#include <functional>
#include <memory>
#include <plog/Log.h>
#include <thread>
#include <uiohook.h>

class UIOHookWrapper {
public:
    UIOHookWrapper();
    ~UIOHookWrapper();

    UIOHookWrapper(const UIOHookWrapper&) = delete;
    UIOHookWrapper& operator=(const UIOHookWrapper&) = delete;

    UIOHookWrapper(UIOHookWrapper&&) noexcept;
    UIOHookWrapper& operator=(UIOHookWrapper&&) noexcept;

    void run();
    void stop();

    using EventCallback = std::function<void(const uiohook_event*)>;
    void setEventCallback(EventCallback callback);

    bool isRunning() const;

private:
    class Impl;
    std::unique_ptr<Impl> pImpl;

    static void dispatchProc(uiohook_event* event, void* user_data);
    static void loggerProc(unsigned int level, void* user_data, const char* format, va_list args);
    void threadProc();
};

class UIOHookWrapper::Impl {
public:
    EventCallback eventCallback;
    std::thread hookThread;
    std::atomic<bool> running { false };
};

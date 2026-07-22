// UIOHookWrapper.cpp
#include "UIOHookWrapper.h"
#include <cstdarg>
#include <iostream>

UIOHookWrapper::UIOHookWrapper()
    : pImpl(std::make_unique<Impl>())
{
    hook_set_logger_proc(&UIOHookWrapper::loggerProc, nullptr);
    hook_set_dispatch_proc(&UIOHookWrapper::dispatchProc, this);
}

UIOHookWrapper::~UIOHookWrapper() { stop(); }

UIOHookWrapper::UIOHookWrapper(UIOHookWrapper&&) noexcept = default;
UIOHookWrapper& UIOHookWrapper::operator=(UIOHookWrapper&&) noexcept = default;

void UIOHookWrapper::run()
{
    if (pImpl->running.load()) {
        PLOGW << "Hook is already running";
        return;
    }

    // The previous thread may have exited on its own (e.g. hook_run failed
    // because input monitoring permission was denied). It is then finished
    // but still joinable, and assigning a new std::thread over a joinable
    // one calls std::terminate. Reap it first.
    if (pImpl->hookThread.joinable()) {
        pImpl->hookThread.join();
    }

    pImpl->running.store(true);
    pImpl->hookThread = std::thread(&UIOHookWrapper::threadProc, this);
}

void UIOHookWrapper::stop()
{
    if (pImpl->running.load()) {
        pImpl->running.store(false);
        hook_stop();
    }

    // Always join, even when the hook already stopped itself: threadProc
    // clears `running` when hook_run returns on its own, and destroying a
    // still-joinable std::thread calls std::terminate (SIGABRT on exit).
    if (pImpl->hookThread.joinable()) {
        pImpl->hookThread.join();
    }
}

void UIOHookWrapper::setEventCallback(EventCallback callback)
{
    pImpl->eventCallback = std::move(callback);
}

bool UIOHookWrapper::isRunning() const { return pImpl->running.load(); }

void UIOHookWrapper::dispatchProc(uiohook_event* event, void* user_data)
{
    auto* self = static_cast<UIOHookWrapper*>(user_data);
    if (self && self->pImpl->eventCallback) {
        self->pImpl->eventCallback(event);
    }
}

void UIOHookWrapper::threadProc()
{
    PLOGI << "Starting libuiohook worker thread";
    int status = hook_run();
    if (status != UIOHOOK_SUCCESS) {
        PLOGE << "Failed to start libuiohook. Error code: " << status;
    }
    pImpl->running.store(false);
    PLOGI << "Stopped libuiohook worker thread";
}

void UIOHookWrapper::loggerProc(
    unsigned int level, void* user_data, const char* format, va_list args)
{
    char buffer[1024];
    vsnprintf(buffer, sizeof(buffer), format, args);

    switch (level) {
    case LOG_LEVEL_DEBUG:
        PLOGV << buffer;
        break;
    case LOG_LEVEL_INFO:
        PLOGI << buffer;
        break;
    case LOG_LEVEL_WARN:
        PLOGW << buffer;
        break;
    case LOG_LEVEL_ERROR:
        PLOGE << buffer;
        break;
    default:
        break;
    }
}

#pragma once
#include "Helpers.hpp"
#include <filesystem>
#include <spdlog/logger.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/spdlog.h>

#include <memory>
class LogFactory {

public:
    LogFactory()
    {
        auto fileName = FileSystem::GetStateFolderPath() / "trackaudio.log";

        trackaudio_logger = spdlog::rotating_logger_mt(
            "trackaudio_logger", fileName.string(), max_size, max_files);

        spdlog::set_default_logger(trackaudio_logger);
        afv_logger
            = spdlog::rotating_logger_mt("afv_logger", fileName.string(), max_size, max_files);

        // NOLINTNEXTLINE this cannot be solved here but in afv
        afv_native::api::setLogger(
            // NOLINTNEXTLINE
            [&](std::string subsystem, std::string file, int line, std::string lineOut) {
                auto strippedFiledName = file.substr(file.find_last_of('/') + 1);
                spdlog::get("afv_logger")
                    ->info("{}:{}:{}: {}", subsystem, strippedFiledName, line, lineOut);
            });
    }

    static void createLoggers() { m_instance = std::make_unique<LogFactory>(); }
    static void destroyLoggers()
    {
        spdlog::shutdown();
        m_instance->afv_logger.reset();
        m_instance->trackaudio_logger.reset();
    }

private:
    static constexpr int max_size = 1048576 * 5;
    static constexpr int max_files = 3;

protected:
    std::shared_ptr<spdlog::logger> afv_logger;
    std::shared_ptr<spdlog::logger> trackaudio_logger;
    static inline std::unique_ptr<LogFactory> m_instance = nullptr;
};

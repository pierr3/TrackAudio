#pragma once
#include "Shared.hpp"
#include "plog/Initializers/RollingFileInitializer.h"
#include <filesystem>
#include <plog/Log.h> // Step1: include the headers

#include <memory>
class LogFactory {

public:
    LogFactory()
    {
        CreateLogFolders();
        auto fileName = LogFactory::getLoggerFilePath();

        plog::init(plog::info, fileName.c_str(), max_size, max_files);

        // Detect whether we should enable verbose logging
        try {
            auto verboseFileName = FileSystem::GetStateFolderPath() / "verbose.enable";
            if (std::filesystem::exists(verboseFileName)) {
                plog::get()->setMaxSeverity(plog::verbose);
            }
        } catch (const std::exception& e) {
            PLOGE << "Error trying to determine whether to enable verbose logging: " << e.what();
        }

        // NOLINTNEXTLINE this cannot be solved here but in afv
        afv_native::api::setLogger(
            // NOLINTNEXTLINE
            [&](std::string subsystem, std::string file, int line, std::string lineOut) {
                auto strippedFiledName = file.substr(file.find_last_of('/') + 1);
                PLOG_INFO << "[afv_native] " << subsystem << ":" << strippedFiledName << ":" << line
                          << ": " << lineOut;
            });
    }

    static void createLoggers() { m_instance = std::make_unique<LogFactory>(); }
    static void destroyLoggers() { m_instance.reset(); }

    static std::string getLoggerFilePath()
    {
        auto fileName = FileSystem::GetStateFolderPath() / "trackaudio.log";
        return fileName.string();
    }

private:
    static void CreateLogFolders()
    {
        if (!std::filesystem::exists(FileSystem::GetStateFolderPath())) {
            std::error_code err;
            if (!std::filesystem::create_directory(FileSystem::GetStateFolderPath(), err)) {
                PLOGE << "Could not create state directory at "
                      << FileSystem::GetStateFolderPath().string() << ": " << err.message();
            }
        }
    }

    static constexpr size_t max_size = 3000000;
    static constexpr int max_files = 3;

protected:
    static inline std::unique_ptr<LogFactory> m_instance = nullptr;
};

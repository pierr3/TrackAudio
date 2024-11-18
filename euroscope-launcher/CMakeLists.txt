cmake_minimum_required(VERSION 3.15)
project(EuroScopeWithTrackAudio VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable Unicode support for MSVC
if(MSVC)
    add_compile_definitions(UNICODE _UNICODE)
endif()

# Create the executable as a Windows application (not console)
add_executable(EuroScopeWithTrackAudio WIN32 src/main.cpp resources.rc)

# Add Windows libraries
target_link_libraries(EuroScopeWithTrackAudio PRIVATE 
    shell32 # For SHGetKnownFolderPath
)

# Set output directories
set_target_properties(EuroScopeWithTrackAudio PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
    RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKE_BINARY_DIR}/bin"
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/bin"
)

# Add icon and version information
if(MSVC)
    set_target_properties(EuroScopeWithTrackAudio PROPERTIES WIN32_EXECUTABLE TRUE)
endif()
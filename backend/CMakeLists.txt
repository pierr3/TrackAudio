cmake_minimum_required(VERSION 3.29.2)

# Include vcpkg toolchain file
set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake"
  CACHE STRING "Vcpkg toolchain file")

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/Debug)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/Release)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/Debug)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/Release)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/Debug)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/Release)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # does not produce the json file
set(CMAKE_EXPORT_COMPILE_COMMANDS ON CACHE INTERNAL "") 

set (CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})
set (CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})

project(trackaudio-afv)

# Set the C++ standard to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_definitions(-DCPPHTTPLIB_OPENSSL_SUPPORT=1)
add_definitions(-DNAPI_VERSION=7)

include_directories(${CMAKE_SOURCE_DIR}/extern/afv-native/include)

if(MSVC)
    add_compile_options(
        $<$<CONFIG:>:/MD>
        $<$<CONFIG:Debug>:/MDd>
        $<$<CONFIG:Release>:/MD>
    )

    add_definitions(-D_WIN32_WINNT=0x0A00)
endif()

set(SOURCE 
  src/main.cpp
  src/sdk.cpp
  src/RemoteData.cpp
  src/InputHandler.cpp
  src/win32_key_util.cpp)

add_library(trackaudio-afv SHARED 
  ${SOURCE}
  ${CMAKE_JS_SRC})

include(FetchContent)
include(ExternalProject)

set(afv_native_VERSION 1.28.0.12)
set(afv_native_ARCHITECTURE "universal")

if (WIN32)
  set(afv_native_ARCHITECTURE "x86_64")
endif()

if (UNIX AND NOT APPLE)
  if (${CMAKE_SYSTEM_PROCESSOR} STREQUAL "aarch64")
    set(afv_native_ARCHITECTURE "arm64")
  else()
    set(afv_native_ARCHITECTURE ${CMAKE_SYSTEM_PROCESSOR})
  endif()
endif()

# Declare the content to be downloaded
FetchContent_Declare(
  afv_native
  URL https://github.com/pierr3/afv-native/releases/download/v${afv_native_VERSION}/libafv-v${afv_native_VERSION}-${CMAKE_SYSTEM_NAME}-${afv_native_ARCHITECTURE}.zip
)

# Get the download directory
FetchContent_GetProperties(afv-native)
if(NOT afv_native_POPULATED)
  FetchContent_Populate(afv_native)
  set(afv_native_SOURCE_DIR ${afv_native_SOURCE_DIR})
endif()

message(STATUS "afv_native_SOURCE_DIR: ${afv_native_SOURCE_DIR}")
list(APPEND CMAKE_MODULE_PATH "${afv_native_SOURCE_DIR}")

# Now that the content has been downloaded, we can use find_package
find_package(afv_native REQUIRED)

# Find the required packages
find_package(Threads REQUIRED)
find_package(httplib CONFIG REQUIRED)
find_package(unofficial-node-addon-api CONFIG REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(absl CONFIG REQUIRED)
find_package(Poco COMPONENTS Foundation Util REQUIRED)
find_package(semver CONFIG REQUIRED)
find_package(restinio CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(quill CONFIG REQUIRED)
find_package(platform_folders CONFIG REQUIRED)
find_package(SFML COMPONENTS system window graphics CONFIG REQUIRED)
find_path(SIMPLEINI_INCLUDE_DIRS "SimpleIni.h")

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
  # Generate node.lib
  execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()

set_target_properties(trackaudio-afv PROPERTIES PREFIX "" SUFFIX ".node")

target_include_directories(trackaudio-afv PRIVATE ${CMAKE_JS_INC} ${SIMPLEINI_INCLUDE_DIRS} include/)

target_link_libraries(trackaudio-afv PRIVATE 
    afv_native
    httplib::httplib
    Threads::Threads
    unofficial::node-addon-api::node-addon-api
    OpenSSL::SSL OpenSSL::Crypto
    absl::strings absl::any
    Poco::Foundation Poco::Util
    semver::semver
    restinio::restinio
    nlohmann_json::nlohmann_json
    quill::quill
    sago::platform_folders
    sfml-system sfml-graphics sfml-window
    ${CMAKE_JS_LIB})

# Set the output directory for the built executable
set_target_properties(trackaudio-afv
    PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

if (UNIX)
  add_custom_command(TARGET trackaudio-afv POST_BUILD  
    COMMAND ${CMAKE_COMMAND} -E copy_if_different  
        $<TARGET_FILE:afv_native>
        ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/$<CONFIG>)   
endif()

if (WIN32)
  add_custom_command(TARGET trackaudio-afv POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_RUNTIME_DLLS:trackaudio-afv> ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/$<CONFIG>
    COMMAND_EXPAND_LISTS
    )

  file(GLOB DLL_FILES "${afv_native_SOURCE_DIR}/lib/*.dll")
  foreach(DLL_FILE ${DLL_FILES})
    add_custom_command(TARGET trackaudio-afv POST_BUILD
      COMMAND ${CMAKE_COMMAND} -E copy ${DLL_FILE} ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/$<CONFIG>
      COMMAND_EXPAND_LISTS
    )
  endforeach()
endif()
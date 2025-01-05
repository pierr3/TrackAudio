// SDK.hpp
#pragma once

#include "sdkWebsocketMessage.hpp"
#include <absl/strings/str_cat.h>
#include <absl/strings/str_join.h>
#include <map>
#include <memory>
#include <mutex>
#include <nlohmann/json_fwd.hpp>
#include <optional>
#include <restinio/all.hpp>
#include <restinio/common_types.hpp>
#include <restinio/http_headers.hpp>
#include <restinio/request_handler.hpp>
#include <restinio/router/express.hpp>
#include <restinio/traits.hpp>
#include <restinio/websocket/message.hpp>
#include <restinio/websocket/websocket.hpp>
#include <set>
#include <string>

using sdk::types::WebsocketMessage;
using sdk::types::WebsocketMessageType;

namespace sdk::types {
enum class Event : std::uint8_t {
    kRxBegin,
    kRxEnd,
    kTxBegin,
    kTxEnd,
    kFrequencyStateUpdate,
    kDisconnectFrequencyStateUpdate,
    kStationStateUpdated,
    kVoiceConnectedState,
};
}

class SDK : public std::enable_shared_from_this<SDK> {
private:
    using serverTraits = restinio::traits_t<restinio::asio_timer_manager_t, restinio::null_logger_t,
        restinio::router::express_router_t<>>;
    using ws_handle_t = restinio::websocket::basic::ws_handle_t;

    // Enhanced WebSocket connection tracking
    struct WebSocketConnection {
        std::shared_ptr<ws_handle_t> handle; // Using the correct type
        std::string clientId;
        std::chrono::system_clock::time_point lastActivity;
    };

    enum class MessageScope { SingleClient, AllClients, AllWithElectron };

    enum sdkCall : std::uint8_t {
        kTransmitting,
        kRx,
        kTx,
        kWebSocket,
    };

    restinio::running_server_handle_t<serverTraits> pSDKServer;
    std::map<std::uint64_t, WebSocketConnection> pWsRegistry;

    static inline std::mutex TransmittingMutex;
    static inline std::set<std::string> CurrentlyTransmittingData;
    static inline std::mutex BroadcastMutex;

    // Private methods
    void sendMessage(uint64_t clientId, const std::string& data);
    void broadcastMessage(const std::string& data, MessageScope scope,
        const std::optional<std::string>& electronEventName = std::nullopt);
    void buildServer();
    std::unique_ptr<restinio::router::express_router_t<>> buildRouter();

    // Request handlers
    static restinio::request_handling_status_t handleTransmittingSDKCall(
        const restinio::request_handle_t& req);
    void handleIncomingWebSocketRequest(const std::string& payload, uint64_t clientId);
    restinio::request_handling_status_t handleRxSDKCall(const restinio::request_handle_t& req);
    restinio::request_handling_status_t handleTxSDKCall(const restinio::request_handle_t& req);
    restinio::request_handling_status_t handleWebSocketSDKCall(
        const restinio::request_handle_t& req);

    // State management handlers
    void handleSetStationState(const nlohmann::json& json, uint64_t clientId);
    void handleGetStationStates(uint64_t requesterId);
    void handleGetStationState(const std::string& callsign, uint64_t requesterId);
    void handleGetMainVolume(uint64_t requesterId);
    void handleAddStation(const nlohmann::json& json, uint64_t clientId);
    void handleChangeStationVolume(const nlohmann::json& json, uint64_t clientId);
    void handleChangeMainVolume(const nlohmann::json& json, uint64_t clientId);

    static std::map<sdkCall, std::string>& getSDKCallUrlMap()
    {
        static std::map<sdkCall, std::string> mSDKCallUrl = { { kTransmitting, "/transmitting" },
            { kRx, "/rx" }, { kTx, "/tx" }, { kWebSocket, "/ws" } };
        return mSDKCallUrl;
    }

public:
    explicit SDK();
    ~SDK();

    // Delete copy and move operations
    SDK(const SDK&) = delete;
    SDK(SDK&&) = delete;
    SDK& operator=(const SDK&) = delete;
    SDK& operator=(SDK&&) = delete;

    // Public API methods
    void handleAFVEventForWebsocket(sdk::types::Event event,
        const std::optional<std::string>& callsign, const std::optional<int>& frequencyHz,
        const std::optional<std::vector<std::string>>& parameter3 = std::nullopt);

    void handleVoiceConnectedEventForWebsocket(bool isVoiceConnected);

    static nlohmann::json buildStationStateJson(
        const std::optional<std::string>& callsign, const int& frequencyHz);

    void publishStationState(const nlohmann::json& state, bool broadcastToElectron = true);
    void publishMainVolumeChange(const float& volume, bool broadcastToElectron = true);
    void publishStationAdded(const std::string& callsign, const int& frequencyHz);
    void publishFrequencyRemoved(const int& frequencyHz);
};

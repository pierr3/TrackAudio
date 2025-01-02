#pragma once

#include "sdkWebsocketMessage.hpp"
#include <map>
#include <memory>
#include <optional>
#include <restinio/all.hpp>
#include <restinio/common_types.hpp>
#include <restinio/http_headers.hpp>
#include <restinio/request_handler.hpp>
#include <restinio/router/express.hpp>
#include <restinio/traits.hpp>
#include <restinio/websocket/message.hpp>
#include <restinio/websocket/websocket.hpp>
#include <string>

#include <absl/strings/str_cat.h>
#include <absl/strings/str_join.h>
#include <mutex>
#include <nlohmann/json_fwd.hpp>
#include <set>

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

public:
    explicit SDK();
    SDK(const SDK&) = delete;
    SDK(SDK&&) = delete;
    SDK& operator=(const SDK&) = delete;
    SDK& operator=(SDK&&) = delete;
    ~SDK();
    /**
     * Handles an AFV event for the websocket.
     *
     * @param event The AFV event to handle.
     * @param data Optional data associated with the event.
     */
    void handleAFVEventForWebsocket(sdk::types::Event event,
        const std::optional<std::string>& callsign, const std::optional<int>& frequencyHz);

    /**
     * Handles an AFV voiceConnected event for the websocket.
     *
     * @param isVoiceConnected True if voice is connected.
     */
    void handleVoiceConnectedEventForWebsocket(bool isVoiceConnected);

    /**
     * @brief Builds a JSON object for the station state.
     *
     * @param callsign The callsign of the station. Optional.
     * @param frequencyHz The frequency of the station.
     *
     * @return The JSON object for the station state.
     */
    static nlohmann::json buildStationStateJson(
        const std::optional<std::string>& callsign, const int& frequencyHz);

    /**
     * @brief Publishes the station state JSON to the websocket clients.
     *
     * @param state A JSON object representing the station state.
     */
    void publishStationState(const nlohmann::json& state);

    /**
     * @brief Publishes the kStationAdded message.
     *
     * @param callsign The callsign for the added station.
     * @param frequencyHz The frequency for the added station.
     */
    void publishStationAdded(const std::string& callsign, const int& frequencyHz);

    /**
     * @brief Publishes the kFrequencyRemoved message.
     *
     * @param frequencyHz The removed frequency.
     */
    void publishFrequencyRemoved(const int& frequencyHz);

private:
    using serverTraits = restinio::traits_t<restinio::asio_timer_manager_t, restinio::null_logger_t,
        restinio::router::express_router_t<>>;

    restinio::running_server_handle_t<serverTraits> pSDKServer;

    using ws_registry_t = std::map<std::uint64_t, restinio::websocket::basic::ws_handle_t>;

    ws_registry_t pWsRegistry;

    enum sdkCall : std::uint8_t {
        kTransmitting,
        kRx,
        kTx,
        kWebSocket,
    };

    static inline std::mutex TransmittingMutex;
    static inline std::set<std::string> CurrentlyTransmittingData;

    static inline std::mutex BroadcastMutex;

    static std::map<sdkCall, std::string>& getSDKCallUrlMap()
    {
        static std::map<sdkCall, std::string> mSDKCallUrl = { { kTransmitting, "/transmitting" },
            { kRx, "/rx" }, { kTx, "/tx" }, { kWebSocket, "/ws" } };
        return mSDKCallUrl;
    }

    /**
     * @brief Broadcasts data on the websocket.
     *
     * This function sends the provided data on the websocket connection.
     *
     * @param data The data to be broadcasted in JSON format.
     */
    void broadcastOnWebsocket(const std::string& data);

    /**
     * @brief Builds the server.
     *
     * This function is responsible for building the server.
     * It performs the necessary initialization and setup tasks
     * to create a functioning server.
     */
    void buildServer();

    /**
     * @brief Builds the router.
     */
    std::unique_ptr<restinio::router::express_router_t<>> buildRouter();

    /**
     * Handles the SDK call for transmitting data.
     *
     * @param req The request handle.
     * @return The status of request handling.
     */
    static restinio::request_handling_status_t handleTransmittingSDKCall(
        const restinio::request_handle_t& req);

    /**
     * Handles an incoming websocket message.
     *
     * @param payload The unparsed JSON payload of the incoming message.
     */
    void handleIncomingWebSocketRequest(const std::string& payload);

    /**handleIncomingWebSocketRequest
     * Handles the SDK call received in the request.
     *
     * @param req The request handle.
     * @return The status of the request handling.
     */
    restinio::request_handling_status_t handleRxSDKCall(const restinio::request_handle_t& req);

    /**
     * Handles the SDK call.
     *
     * @param req The request handle.
     * @return The request handling status.
     */
    restinio::request_handling_status_t handleTxSDKCall(const restinio::request_handle_t& req);

    /**
     * Handles a WebSocket SDK call.
     *
     * @param req The request handle.
     * @return The status of the request handling.
     */
    restinio::request_handling_status_t handleWebSocketSDKCall(
        const restinio::request_handle_t& req);

    /**
     * Handles the SDK call to set a station status.
     *
     * @param json The incoming JSON with the station status.
     */
    void handleSetStationState(const nlohmann::json& json);

    /**
     * Handles the SDK call to publish all the current station states.
     *
     */
    void handleGetStationStates();

    /**
     * Handles the SDK call to publish the current station state for a single station.
     *
     */
    void handleGetStationState(const std::string& callsign);

    /**
     * Handles the SDK call to add a station.
     *
     * @param json The incoming JSON with the station information.
     */
    void handleAddStation(const nlohmann::json& json);

    /**
     * Handles the SDK call to increment or decrement the station gain.
     *
     * @param json The incoming JSON with the station information.
     * @param isIncrement True if incrementing, false if decrementing.
     */
    void handleChangeStationGain(const nlohmann::json& json, bool isIncrement);
};

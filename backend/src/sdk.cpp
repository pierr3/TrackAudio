#include "sdk.hpp"
#include "Helpers.hpp"
#include "Shared.hpp"
#include <quill/Quill.h>

SDK::SDK() { this->buildServer(); }

SDK::~SDK()
{
    for (auto [id, ws] : this->pWsRegistry) {
        ws->shutdown();
        ws.reset();
    }
    this->pWsRegistry.clear();
    this->pSDKServer->stop();
    this->pSDKServer.reset();
}

void SDK::buildServer()
{
    try {
        pSDKServer = restinio::run_async<>(restinio::own_io_context(),
            restinio::server_settings_t<serverTraits> {}
                .port(API_SERVER_PORT)
                .address("0.0.0.0")
                .request_handler(std::move(this->buildRouter())),
            16U);
    } catch (const std::exception& ex) {
        TRACK_LOG_ERROR("Error while starting SDK server: {}", ex.what());
    }
}

void SDK::handleAFVEventForWebsocket(sdk::types::Event event,
    const std::optional<std::string>& callsign,
    const std::optional<int>& frequencyHz)
{

    if (event == sdk::types::Event::kDisconnectFrequencyStateUpdate) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(
            WebsocketMessageType::kFrequencyStateUpdate);

        jsonMessage["value"]["rx"] = nlohmann::json::array();
        jsonMessage["value"]["tx"] = nlohmann::json::array();
        jsonMessage["value"]["xc"] = nlohmann::json::array();
        this->broadcastOnWebsocket(jsonMessage.dump());
        return;
    }

    if (!this->pSDKServer || !mClient->IsVoiceConnected()) {
        return;
    }

    if (event == sdk::types::Event::kRxBegin && callsign && frequencyHz) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kRxBegin);
        jsonMessage["value"]["callsign"] = *callsign;
        jsonMessage["value"]["pFrequencyHz"] = *frequencyHz;
        this->broadcastOnWebsocket(jsonMessage.dump());

        std::lock_guard<std::mutex> lock(TransmittingMutex);
        CurrentlyTransmittingData.insert(*callsign);
        return;
    }

    if (event == sdk::types::Event::kRxEnd && callsign && frequencyHz) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kRxEnd);
        jsonMessage["value"]["callsign"] = *callsign;
        jsonMessage["value"]["pFrequencyHz"] = *frequencyHz;
        this->broadcastOnWebsocket(jsonMessage.dump());

        std::lock_guard<std::mutex> lock(TransmittingMutex);
        CurrentlyTransmittingData.erase(*callsign);
        return;
    }

    if (event == sdk::types::Event::kFrequencyStateUpdate) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(
            WebsocketMessageType::kFrequencyStateUpdate);

        std::vector<ns::Station> rxBar;
        std::vector<ns::Station> txBar;
        std::vector<ns::Station> xcBar;
        auto allRadios = mClient->getRadioState();
        for (const auto& [frequency, state] : allRadios) {
            // NOLINTNEXTLINE
            ns::Station stationObject = ns::Station::build(state.stationName, frequency);
            if (state.rx) {
                rxBar.push_back(stationObject);
            }
            if (state.tx) {
                txBar.push_back(stationObject);
            }
            if (state.xc) {
                xcBar.push_back(stationObject);
            }
        }

        jsonMessage["value"]["rx"] = std::move(rxBar);
        jsonMessage["value"]["tx"] = std::move(txBar);
        jsonMessage["value"]["xc"] = std::move(xcBar);

        this->broadcastOnWebsocket(jsonMessage.dump());

        return;
    }
};

std::unique_ptr<restinio::router::express_router_t<>> SDK::buildRouter()
{

    auto routeMap = getSDKCallUrlMap();
    std::unique_ptr<restinio::router::express_router_t<>> router;
    router = std::make_unique<restinio::router::express_router_t<>>();
    router->http_get(routeMap[sdkCall::kTransmitting],
        [&](auto req, auto /*params*/) {
            return SDK::handleTransmittingSDKCall(req);
        });

    router->http_get(
        routeMap[sdkCall::kRx],
        [&](auto req, auto /*params*/) { return this->handleRxSDKCall(req); });

    router->http_get(
        routeMap[sdkCall::kTx],
        [&](auto req, auto /*params*/) { return this->handleTxSDKCall(req); });

    router->http_get(
        routeMap[sdkCall::kWebSocket],
        [&](auto req, auto /*params*/) { return handleWebSocketSDKCall(req); });

    router->non_matched_request_handler([](auto req) {
        return req->create_response().set_body(CLIENT_NAME).done();
    });

    auto methodNotAllowed = [](const auto& req, auto) {
        return req->create_response(restinio::status_method_not_allowed())
            .connection_close()
            .done();
    };

    router->add_handler(
        restinio::router::none_of_methods(restinio::http_method_get()), "/",
        methodNotAllowed);

    return std::move(router);
}

restinio::request_handling_status_t
SDK::handleTransmittingSDKCall(const restinio::request_handle_t& req)
{
    const std::lock_guard<std::mutex> lock(TransmittingMutex);
    std::string out = absl::StrJoin(CurrentlyTransmittingData, ",");
    return req->create_response().set_body(out).done();
};

restinio::request_handling_status_t
SDK::handleRxSDKCall(const restinio::request_handle_t& req)
{
    if (!mClient->IsVoiceConnected()) {
        return req->create_response().set_body("").done();
    }

    std::vector<std::string> outData;
    for (const auto& [freq, state] : mClient->getRadioState()) {
        if (!mClient->GetRxState(freq)) {
            continue;
        }
        outData.push_back(state.stationName + ":" + Helpers::ConvertHzToHumanString(freq));
    }

    return req->create_response().set_body(absl::StrJoin(outData, ",")).done();
};

restinio::request_handling_status_t
SDK::handleTxSDKCall(const restinio::request_handle_t& req)
{
    if (!mClient->IsVoiceConnected()) {
        return req->create_response().set_body("").done();
    }

    std::vector<std::string> outData;
    for (const auto& [freq, state] : mClient->getRadioState()) {
        if (!mClient->GetTxState(freq)) {
            continue;
        }
        outData.push_back(state.stationName + ":" + Helpers::ConvertHzToHumanString(freq));
    }

    return req->create_response().set_body(absl::StrJoin(outData, ",")).done();
}

restinio::request_handling_status_t
SDK::handleWebSocketSDKCall(const restinio::request_handle_t& req)
{
    if (restinio::http_connection_header_t::upgrade != req->header().connection()) {
        return restinio::request_rejected();
    }

    auto wsh = restinio::websocket::basic::upgrade<serverTraits>(
        *req, restinio::websocket::basic::activation_t::immediate,
        [&](auto wsh, auto m) {
            if (restinio::websocket::basic::opcode_t::ping_frame == m->opcode()) {
                // Ping-Pong
                auto resp = *m;
                resp.set_opcode(restinio::websocket::basic::opcode_t::pong_frame);
                wsh->send_message(resp);
            } else if (restinio::websocket::basic::opcode_t::
                           connection_close_frame
                == m->opcode()) {
                // Close connection
                this->pWsRegistry.erase(wsh->connection_id());
            }
        });

    // Store websocket connection
    this->pWsRegistry.emplace(wsh->connection_id(), wsh);

    // Upon connection, send the status of frequencies straight away
    {
        this->handleAFVEventForWebsocket(sdk::types::Event::kFrequencyStateUpdate,
            std::nullopt, std::nullopt);
    }

    return restinio::request_accepted();
};

void SDK::broadcastOnWebsocket(const std::string& data)
{
    std::lock_guard<std::mutex> lock(BroadcastMutex);
    restinio::websocket::basic::message_t outgoingMessage;
    outgoingMessage.set_opcode(restinio::websocket::basic::opcode_t::text_frame);
    outgoingMessage.set_payload(data);

    for (auto& [id, ws] : this->pWsRegistry) {
        try {
            ws->send_message(outgoingMessage);
        } catch (const std::exception& ex) {
            TRACK_LOG_ERROR("Error while sending message to websocket: {}",
                ex.what());
        }
    }
};

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

// NOLINTNEXTLINE
void SDK::handleAFVEventForWebsocket(sdk::types::Event event,
    const std::optional<std::string>& callsign, const std::optional<int>& frequencyHz)
{

    if (event == sdk::types::Event::kDisconnectFrequencyStateUpdate) {
        nlohmann::json jsonMessage
            = WebsocketMessage::buildMessage(WebsocketMessageType::kFrequencyStateUpdate);

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

    if (event == sdk::types::Event::kTxBegin) {
        auto allRadios = mClient->getRadioState();
        std::vector<unsigned int> allTxRadioFreqs;
        for (const auto& [freq, state] : allRadios) {
            if (state.tx) {
                allTxRadioFreqs.push_back(freq);
            }
        }

        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kTxBegin);
        jsonMessage["value"]["pFrequenciesHz"] = allTxRadioFreqs;
        this->broadcastOnWebsocket(jsonMessage.dump());
    }

    if (event == sdk::types::Event::kTxEnd) {
        auto allRadios = mClient->getRadioState();
        std::vector<unsigned int> allTxRadioFreqs;
        for (const auto& [freq, state] : allRadios) {
            if (state.tx) {
                allTxRadioFreqs.push_back(freq);
            }
        }

        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kTxEnd);
        jsonMessage["value"]["pFrequenciesHz"] = allTxRadioFreqs;
        this->broadcastOnWebsocket(jsonMessage.dump());
    }

    if (event == sdk::types::Event::kFrequencyStateUpdate) {
        nlohmann::json jsonMessage
            = WebsocketMessage::buildMessage(WebsocketMessageType::kFrequencyStateUpdate);

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
        [&](auto req, auto /*params*/) { return SDK::handleTransmittingSDKCall(req); });

    router->http_get(routeMap[sdkCall::kRx],
        [&](auto req, auto /*params*/) { return this->handleRxSDKCall(req); });

    router->http_get(routeMap[sdkCall::kTx],
        [&](auto req, auto /*params*/) { return this->handleTxSDKCall(req); });

    router->http_get(routeMap[sdkCall::kWebSocket],
        [&](auto req, auto /*params*/) { return handleWebSocketSDKCall(req); });

    router->non_matched_request_handler(
        [](auto req) { return req->create_response().set_body(CLIENT_NAME).done(); });

    auto methodNotAllowed = [](const auto& req, auto) {
        return req->create_response(restinio::status_method_not_allowed())
            .connection_close()
            .done();
    };

    router->add_handler(
        restinio::router::none_of_methods(restinio::http_method_get()), "/", methodNotAllowed);

    return std::move(router);
}

restinio::request_handling_status_t SDK::handleTransmittingSDKCall(
    const restinio::request_handle_t& req)
{
    const std::lock_guard<std::mutex> lock(TransmittingMutex);
    std::string out = absl::StrJoin(CurrentlyTransmittingData, ",");
    return req->create_response().set_body(out).done();
};

// NOLINTNEXTLINE
restinio::request_handling_status_t SDK::handleRxSDKCall(const restinio::request_handle_t& req)
{
    if (!mClient->IsVoiceConnected()) {
        return req->create_response().set_body("").done();
    }

    std::vector<std::string> outData;
    for (const auto& [freq, state] : mClient->getRadioState()) {
        if (!state.rx) {
            continue;
        }
        outData.push_back(state.stationName + ":" + Helpers::ConvertHzToHumanString(freq));
    }

    return req->create_response().set_body(absl::StrJoin(outData, ",")).done();
};

// NOLINTNEXTLINE
restinio::request_handling_status_t SDK::handleTxSDKCall(const restinio::request_handle_t& req)
{
    if (!mClient->IsVoiceConnected()) {
        return req->create_response().set_body("").done();
    }

    std::vector<std::string> outData;
    for (const auto& [freq, state] : mClient->getRadioState()) {
        if (!state.tx) {
            continue;
        }
        outData.push_back(state.stationName + ":" + Helpers::ConvertHzToHumanString(freq));
    }

    return req->create_response().set_body(absl::StrJoin(outData, ",")).done();
}

void SDK::handleSetStationStatus(const nlohmann::json json)
{
    if (!json["value"].contains("frequency")) {
        TRACK_LOG_ERROR("kSetStationStatus requires a frequency");
        return;
    }

    int frequency = json["value"]["frequency"];

    if (json["value"].contains("rx")) {
        bool oldRxValue = mClient->GetRxState(frequency);
        auto rx = json["value"]["rx"].get<bool>();

        TRACK_LOG_INFO("Setting Rx for {} to {}", frequency, rx);
        mClient->SetRx(frequency, rx);

        if (!oldRxValue && rx) {
            // When turning on RX, we refresh the transceivers
            auto states = mClient->getRadioState();
            if (states.find(frequency) != states.end() && !states[frequency].stationName.empty()) {
                mClient->FetchTransceiverInfo(states[frequency].stationName);
            }
        }
    }

    if (json["value"].contains("tx")) {
        auto tx = json["value"]["tx"].get<bool>();

        TRACK_LOG_INFO("Setting Tx for {} to {}", frequency, tx);
        mClient->SetTx(frequency, tx);
    }

    if (json["value"].contains("xc")) {
        auto xc = json["value"]["xc"].get<bool>();

        TRACK_LOG_INFO("Setting Xc for {} to {}", frequency, xc);
        mClient->SetXc(frequency, xc);
    }

    if (json["value"].contains("spk")) {
        auto spk = json["value"]["xc"].get<bool>();

        TRACK_LOG_INFO("Setting SPK for {} to {}", frequency, spk);
        mClient->SetOnHeadset(frequency, !spk);
    }
}

restinio::request_handling_status_t SDK::handleWebSocketSDKCall(
    const restinio::request_handle_t& req)
{
    if (restinio::http_connection_header_t::upgrade != req->header().connection()) {
        return restinio::request_rejected();
    }

    auto wsh = restinio::websocket::basic::upgrade<serverTraits>(
        *req, restinio::websocket::basic::activation_t::immediate, [&](auto wsh, auto message) {
            if (restinio::websocket::basic::opcode_t::ping_frame == message->opcode()) {
                // Ping-Pong
                auto resp = *message;
                resp.set_opcode(restinio::websocket::basic::opcode_t::pong_frame);
                wsh->send_message(resp);
            } else if (restinio::websocket::basic::opcode_t::connection_close_frame
                == message->opcode()) {
                // Close connection
                this->pWsRegistry.erase(wsh->connection_id());
            } else if (restinio::websocket::basic::opcode_t::text_frame == message->opcode()) {
                std::string payload = message->payload();

                try {
                    auto json = nlohmann::json::parse(payload);
                    std::string messageType = json["type"];
                    if (messageType == "kSetStationStatus") {
                        this->handleSetStationStatus(std::move(json));
                    }
                } catch (const std::exception& e) {
                    // Handle JSON parsing error
                    TRACK_LOG_ERROR("Error parsing incoming message JSON: ", e.what());
                }
            }
        });

    // Store websocket connection
    this->pWsRegistry.emplace(wsh->connection_id(), wsh);

    // Upon connection, send the status of frequencies straight away
    {
        this->handleAFVEventForWebsocket(
            sdk::types::Event::kFrequencyStateUpdate, std::nullopt, std::nullopt);
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
            TRACK_LOG_ERROR("Error while sending message to websocket: {}", ex.what());
        }
    }
};

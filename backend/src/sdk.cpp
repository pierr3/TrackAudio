#include "sdk.hpp"
#include "Helpers.hpp"
#include "RadioHelper.hpp"
#include "Shared.hpp"

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

nlohmann::json SDK::buildStationStateJson(
    const std::optional<std::string>& callsign, const int& frequencyHz)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationStateUpdate);

    if (callsign.has_value()) {
        jsonMessage["value"]["callsign"] = callsign.value();
    }
    jsonMessage["value"]["frequency"] = frequencyHz;
    jsonMessage["value"]["tx"] = mClient->GetTxState(frequencyHz);
    jsonMessage["value"]["rx"] = mClient->GetRxState(frequencyHz);
    jsonMessage["value"]["xc"] = mClient->GetXcState(frequencyHz);
    jsonMessage["value"]["xca"] = mClient->GetCrossCoupleAcrossState(frequencyHz);
    jsonMessage["value"]["headset"] = mClient->GetOnHeadset(frequencyHz);

    return jsonMessage;
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
        // auto allRadios = mClient->getRadioState();
        // std::vector<unsigned int> allTxRadioFreqs;
        // for (const auto& [freq, state] : allRadios) {
        //     if (state.tx) {
        //         allTxRadioFreqs.push_back(freq);
        //     }
        // }

        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kTxBegin);
        // jsonMessage["value"]["pFrequenciesHz"] = allTxRadioFreqs;
        this->broadcastOnWebsocket(jsonMessage.dump());
        return;
    }

    if (event == sdk::types::Event::kTxEnd) {
        // auto allRadios = mClient->getRadioState();
        // std::vector<unsigned int> allTxRadioFreqs;
        // for (const auto& [freq, state] : allRadios) {
        //     if (state.tx) {
        //         allTxRadioFreqs.push_back(freq);
        //     }
        // }

        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kTxEnd);
        // jsonMessage["value"]["pFrequenciesHz"] = allTxRadioFreqs;
        this->broadcastOnWebsocket(jsonMessage.dump());
        return;
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

    if (event == sdk::types::Event::kStationStateUpdated) {
        if (!frequencyHz.has_value()) {
            TRACK_LOG_ERROR("kStationStateUpdated requires a frequencyHz");
            return;
        }

        this->broadcastOnWebsocket(
            this->buildStationStateJson(callsign, frequencyHz.value()).dump());
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

void SDK::handleSetStationState(const nlohmann::json json)
{
    if (!json["value"].contains("frequency")) {
        TRACK_LOG_ERROR("kSetStationState requires a frequency");
        return;
    }

    TRACK_LOG_INFO("handleSetStationState received {}", json.dump(4));

    RadioState radioState;
    auto frequency = json["value"]["frequency"];

    radioState.frequency = frequency;

    auto currentValue = mClient->GetRxState(frequency);
    if (json["value"].contains("rx")) {
        radioState.rx = Helpers::ConvertBoolOrToggleToBool(json["value"]["rx"], currentValue);
    } else {
        radioState.rx = currentValue;
    }

    currentValue = mClient->GetTxState(frequency);
    if (json["value"].contains("tx")) {
        radioState.tx = Helpers::ConvertBoolOrToggleToBool(json["value"]["tx"], currentValue);
    } else {
        radioState.tx = currentValue;
    }

    currentValue = mClient->GetXcState(frequency);
    if (json["value"].contains("xc")) {
        radioState.xc = Helpers::ConvertBoolOrToggleToBool(json["value"]["xc"], currentValue);
    } else {
        radioState.xc = currentValue;
    }

    currentValue = mClient->GetCrossCoupleAcrossState(frequency);
    if (json["value"].contains("xca")) {
        radioState.xca = Helpers::ConvertBoolOrToggleToBool(json["value"]["xca"], currentValue);
    } else {
        radioState.xca = currentValue;
    }

    currentValue = mClient->GetOnHeadset(frequency);
    if (json["value"].contains("headset")) {
        radioState.headset
            = Helpers::ConvertBoolOrToggleToBool(json["value"]["headset"], currentValue);
    } else {
        radioState.headset = currentValue;
    }

    RadioHelper::SetRadioState(this, radioState);
}

void SDK::handleGetStationStates()
{
    std::vector<nlohmann::json> stationStates;

    // Collect the states for all the radios
    auto allRadios = mClient->getRadioState();
    for (const auto& [frequency, state] : allRadios) {
        stationStates.push_back(this->buildStationStateJson(state.stationName, frequency));
    }

    // Send the message
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationStates);
    jsonMessage["value"]["stations"] = stationStates;
    this->broadcastOnWebsocket(jsonMessage.dump());
}

void SDK::handleGetStationState(const std::string& callsign)
{
    if (!mClient->IsVoiceConnected()) {
        TRACK_LOG_ERROR("kGetStationState requires a voice connection");
        return;
    }

    auto allRadios = mClient->getRadioState();
    for (const auto& [frequency, state] : allRadios) {
        if (state.stationName == callsign) {
            this->publishStationState(this->buildStationStateJson(callsign, frequency));
            return;
        }
    }

    TRACK_LOG_ERROR("Station {} not found", callsign);
}

void SDK::publishStationState(const nlohmann::json& state)
{
    this->broadcastOnWebsocket(state.dump());
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
                    if (messageType == "kSetStationState") {
                        this->handleSetStationState(std::move(json));
                        return;
                    }
                    if (messageType == "kGetStationStates") {
                        this->handleGetStationStates();
                        return;
                    }
                    if (messageType == "kGetStationState") {
                        this->handleGetStationState(json["value"]["callsign"]);
                        return;
                    }
                    if (messageType == "kPttPressed") {
                        mClient->SetPtt(true);
                        return;
                    }
                    if (messageType == "kPttReleased") {
                        mClient->SetPtt(false);
                        return;
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

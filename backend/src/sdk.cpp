#include "sdk.hpp"
#include "Helpers.hpp"
#include "RadioHelper.hpp"
#include "Shared.hpp"
#include <plog/Log.h>

SDK::SDK() { this->buildServer(); }

SDK::~SDK()
{
    std::lock_guard<std::mutex> lock(BroadcastMutex);
    for (auto& [id, conn] : this->pWsRegistry) {
        if (conn.handle) {
            try {
                conn.handle->get()->shutdown();
            } catch (const std::exception& ex) {
                PLOG_ERROR << "Error shutting down websocket: " << ex.what();
            }
        }
    }
    this->pWsRegistry.clear();

    if (this->pSDKServer) {
        this->pSDKServer->stop();
    }
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
        PLOG_ERROR << "Error while starting SDK server: " << ex.what();
    }
}

void SDK::sendMessage(uint64_t clientId, const std::string& data)
{
    std::lock_guard<std::mutex> lock(BroadcastMutex);
    auto it = this->pWsRegistry.find(clientId);
    if (it != this->pWsRegistry.end() && it->second.handle) {
        try {
            restinio::websocket::basic::message_t message;
            message.set_opcode(restinio::websocket::basic::opcode_t::text_frame);
            message.set_payload(data);
            it->second.handle->get()->send_message(message);
            it->second.lastActivity = std::chrono::system_clock::now();
        } catch (const std::exception& ex) {
            PLOG_ERROR << "Error sending message to client " << clientId << ": " << ex.what();
        }
    }
}

void SDK::broadcastMessage(const std::string& data, MessageScope scope,
    const std::optional<std::string>& electronEventName)
{
    std::lock_guard<std::mutex> lock(BroadcastMutex);

    restinio::websocket::basic::message_t message;
    message.set_opcode(restinio::websocket::basic::opcode_t::text_frame);
    message.set_payload(data);

    for (auto& [id, conn] : this->pWsRegistry) {
        if (conn.handle) {
            try {
                conn.handle->get()->send_message(message);
                conn.lastActivity = std::chrono::system_clock::now();
            } catch (const std::exception& ex) {
                PLOG_ERROR << "Error broadcasting to client " << id << ": " << ex.what();
            }
        }
    }

    if (scope == MessageScope::AllWithElectron && electronEventName) {
        NapiHelpers::callElectron(electronEventName.value(), data);
    }
}

restinio::request_handling_status_t SDK::handleWebSocketSDKCall(
    const restinio::request_handle_t& req)
{
    if (restinio::http_connection_header_t::upgrade != req->header().connection()) {
        return restinio::request_rejected();
    }

    auto wsh = restinio::websocket::basic::upgrade<serverTraits>(
        *req, restinio::websocket::basic::activation_t::immediate, [this](auto wsh, auto message) {
            if (restinio::websocket::basic::opcode_t::text_frame == message->opcode()) {
                this->handleIncomingWebSocketRequest(message->payload(), wsh->connection_id());
            } else if (restinio::websocket::basic::opcode_t::ping_frame == message->opcode()) {
                auto resp = *message;
                resp.set_opcode(restinio::websocket::basic::opcode_t::pong_frame);
                wsh->send_message(resp);
            } else if (restinio::websocket::basic::opcode_t::connection_close_frame
                == message->opcode()) {
                this->pWsRegistry.erase(wsh->connection_id());
            }
        });

    WebSocketConnection conn { std::make_shared<restinio::websocket::basic::ws_handle_t>(wsh),
        "client_" + std::to_string(wsh->connection_id()), std::chrono::system_clock::now() };
    this->pWsRegistry.emplace(wsh->connection_id(), std::move(conn));

    this->handleAFVEventForWebsocket(
        sdk::types::Event::kFrequencyStateUpdate, std::nullopt, std::nullopt);

    return restinio::request_accepted();
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
    jsonMessage["value"]["isAvailable"] = true;
    jsonMessage["value"]["isOutputMuted"] = mClient->GetIsOutputMutedState(frequencyHz);
    jsonMessage["value"]["outputVolume"] = RadioHelper::getRadioVolume(frequencyHz);

    return jsonMessage;
}

void SDK::handleVoiceConnectedEventForWebsocket(bool isVoiceConnected)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kVoiceConnectedState);
    jsonMessage["value"]["connected"] = isVoiceConnected;
    broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
}

void SDK::handleAFVEventForWebsocket(sdk::types::Event event,
    const std::optional<std::string>& callsign, const std::optional<int>& frequencyHz,
    const std::optional<std::vector<std::string>>& parameter3)
{

    if (event == sdk::types::Event::kDisconnectFrequencyStateUpdate) {
        nlohmann::json jsonMessage
            = WebsocketMessage::buildMessage(WebsocketMessageType::kFrequencyStateUpdate);
        jsonMessage["value"]["rx"] = nlohmann::json::array();
        jsonMessage["value"]["tx"] = nlohmann::json::array();
        jsonMessage["value"]["xc"] = nlohmann::json::array();
        broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
        return;
    }

    if (!this->pSDKServer || !mClient->IsVoiceConnected()) {
        return;
    }

    if (event == sdk::types::Event::kRxBegin && callsign && frequencyHz) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kRxBegin);
        jsonMessage["value"]["callsign"] = *callsign;
        jsonMessage["value"]["pFrequencyHz"] = *frequencyHz;
        jsonMessage["value"]["activeTransmitters"] = *parameter3;
        broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);

        std::lock_guard<std::mutex> lock(TransmittingMutex);
        CurrentlyTransmittingData.insert(*callsign);
        return;
    }

    if (event == sdk::types::Event::kRxEnd && callsign && frequencyHz && parameter3) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kRxEnd);
        jsonMessage["value"]["callsign"] = *callsign;
        jsonMessage["value"]["pFrequencyHz"] = *frequencyHz;
        jsonMessage["value"]["activeTransmitters"] = *parameter3;
        broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);

        std::lock_guard<std::mutex> lock(TransmittingMutex);
        CurrentlyTransmittingData.erase(*callsign);
        return;
    }

    if (event == sdk::types::Event::kTxBegin) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kTxBegin);
        broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
        return;
    }

    if (event == sdk::types::Event::kTxEnd) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kTxEnd);
        broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
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

        broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
        return;
    }

    if (event == sdk::types::Event::kStationStateUpdate) {
        if (!frequencyHz.has_value()) {
            PLOG_ERROR << "kStationStateUpdated requires a frequencyHz";
            return;
        }

        broadcastMessage(this->buildStationStateJson(callsign, frequencyHz.value()).dump(),
            MessageScope::AllWithElectron);
        return;
    }
}

void SDK::publishStationState(const nlohmann::json& state, bool broadcastToElectron)
{
    broadcastMessage(state.dump(),
        broadcastToElectron ? MessageScope::AllWithElectron : MessageScope::AllClients,
        "station-state-update");
}

void SDK::publishMainVolumeChange(const float& volume, bool broadcastToElectron)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kMainVolumeChange);
    jsonMessage["value"]["volume"] = volume;
    broadcastMessage(jsonMessage.dump(),
        broadcastToElectron ? MessageScope::AllWithElectron : MessageScope::AllClients,
        "main-volume-change");
}

void SDK::publishStationAdded(const std::string& callsign, const int& frequencyHz)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationAdded);
    jsonMessage["value"]["callsign"] = callsign;
    jsonMessage["value"]["frequency"] = frequencyHz;
    broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
}

void SDK::publishFrequencyRemoved(const int& frequencyHz)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kFrequencyRemoved);
    jsonMessage["value"]["frequency"] = frequencyHz;
    broadcastMessage(jsonMessage.dump(), MessageScope::AllClients);
}

std::unique_ptr<restinio::router::express_router_t<>> SDK::buildRouter()
{
    auto routeMap = getSDKCallUrlMap();
    auto router = std::make_unique<restinio::router::express_router_t<>>();

    router->http_get(routeMap[sdkCall::kTransmitting],
        [&](const auto& req, auto) { return SDK::handleTransmittingSDKCall(req); });

    router->http_get(
        routeMap[sdkCall::kRx], [&](const auto& req, auto) { return this->handleRxSDKCall(req); });

    router->http_get(
        routeMap[sdkCall::kTx], [&](const auto& req, auto) { return this->handleTxSDKCall(req); });

    router->http_get(routeMap[sdkCall::kWebSocket],
        [&](const auto& req, auto) { return handleWebSocketSDKCall(req); });

    router->non_matched_request_handler(
        [](const auto& req) { return req->create_response().set_body(CLIENT_NAME).done(); });

    auto methodNotAllowed = [](const auto& req, auto) {
        return req->create_response(restinio::status_method_not_allowed())
            .connection_close()
            .done();
    };

    router->add_handler(
        restinio::router::none_of_methods(restinio::http_method_get()), "/", methodNotAllowed);

    return router;
}

restinio::request_handling_status_t SDK::handleTransmittingSDKCall(
    const restinio::request_handle_t& req)
{
    const std::lock_guard<std::mutex> lock(TransmittingMutex);
    std::string out = absl::StrJoin(CurrentlyTransmittingData, ",");
    return req->create_response().set_body(out).done();
}

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
}

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

void SDK::handleIncomingWebSocketRequest(const std::string& payload, uint64_t clientId)
{
    try {
        auto json = nlohmann::json::parse(payload);
        std::string messageType = json["type"];

        if (messageType == "kSetStationState") {
            this->handleSetStationState(json, clientId);
        } else if (messageType == "kGetStationStates") {
            this->handleGetStationStates(clientId);
        } else if (messageType == "kGetStationState") {
            this->handleGetStationState(json["value"]["callsign"], clientId);
        } else if (messageType == "kGetMainVolume") {
            this->handleGetMainVolume(clientId);
        } else if (messageType == "kPttPressed") {
            mClient->SetPtt(true);
        } else if (messageType == "kPttReleased") {
            mClient->SetPtt(false);
        } else if (messageType == "kGetVoiceConnectedState") {
            this->handleVoiceConnectedEventForWebsocket(mClient->IsVoiceConnected());
        } else if (messageType == "kAddStation") {
            this->handleAddStation(json, clientId);
        } else if (messageType == "kChangeStationVolume") {
            this->handleChangeStationVolume(json, clientId);
        } else if (messageType == "kChangeMainVolume") {
            this->handleChangeMainVolume(json, clientId);
        }
    } catch (const std::exception& e) {
        PLOG_ERROR << "Error parsing incoming message JSON: " << e.what();
    }
}

void SDK::handleSetStationState(const nlohmann::json& json, uint64_t clientId)
{
    if (!json["value"].contains("frequency")) {
        PLOG_ERROR << "kSetStationState requires a frequency";
        return;
    }

    PLOG_INFO << "handleSetStationState received " << json.dump(4);

    RadioState radioState {};
    auto frequency = json["value"]["frequency"];

    radioState.frequency = frequency;

    auto rxValue = mClient->GetRxState(frequency);
    if (json["value"].contains("rx")) {
        radioState.rx = Helpers::ConvertBoolOrToggleToBool(json["value"]["rx"], rxValue);
    } else {
        radioState.rx = rxValue;
    }

    auto txValue = mClient->GetTxState(frequency);
    if (json["value"].contains("tx")) {
        radioState.tx = Helpers::ConvertBoolOrToggleToBool(json["value"]["tx"], txValue);

        if (radioState.tx) {
            radioState.rx = true;
        }
    } else if (json["value"].contains("rx") && !radioState.rx) {
        radioState.tx = false;
    } else {
        radioState.tx = txValue;
    }

    auto xcValue = mClient->GetXcState(frequency);
    if (json["value"].contains("xc")) {
        radioState.xc = Helpers::ConvertBoolOrToggleToBool(json["value"]["xc"], xcValue);

        if (radioState.xc) {
            radioState.tx = true;
            radioState.rx = true;
        }
    } else {
        radioState.xc = xcValue;
    }

    auto xcaValue = mClient->GetCrossCoupleAcrossState(frequency);
    if (json["value"].contains("xca")) {
        radioState.xca = Helpers::ConvertBoolOrToggleToBool(json["value"]["xca"], xcaValue);

        if (radioState.xca) {
            radioState.tx = true;
            radioState.rx = true;
        }
    } else {
        radioState.xca = xcaValue;
    }

    if (!radioState.rx) {
        radioState.tx = false;
        radioState.xc = false;
        radioState.xca = false;
    }

    if (!radioState.tx) {
        radioState.xc = false;
        radioState.xca = false;
    }

    auto headsetValue = mClient->GetOnHeadset(frequency);
    if (json["value"].contains("headset")) {
        radioState.headset
            = Helpers::ConvertBoolOrToggleToBool(json["value"]["headset"], headsetValue);
    } else {
        radioState.headset = headsetValue;
    }

    auto mutedValue = mClient->GetIsOutputMutedState(frequency);
    if (json["value"].contains("isOutputMuted")) {
        radioState.isOutputMuted
            = Helpers::ConvertBoolOrToggleToBool(json["value"]["isOutputMuted"], mutedValue);
    } else {
        radioState.isOutputMuted = mutedValue;
    }

    auto gainValue = RadioHelper::getRadioVolume(frequency);
    if (json["value"].contains("outputVolume")) {
        radioState.outputVolume = json["value"]["outputVolume"];
    } else {
        radioState.outputVolume = gainValue;
    }

    RadioHelper::SetRadioState(shared_from_this(), radioState);
}

void SDK::handleGetStationStates(uint64_t requesterId)
{
    std::vector<nlohmann::json> stationStates;

    auto allRadios = mClient->getRadioState();
    stationStates.reserve(allRadios.size());
    for (const auto& [frequency, state] : allRadios) {
        stationStates.push_back(
            this->buildStationStateJson(state.stationName, static_cast<int>(frequency)));
    }

    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationStates);
    jsonMessage["value"]["stations"] = stationStates;
    sendMessage(requesterId, jsonMessage.dump());
}

void SDK::handleGetStationState(const std::string& callsign, uint64_t requesterId)
{
    if (!mClient->IsVoiceConnected()) {
        PLOG_ERROR << "kGetStationState requires a voice connection";
        return;
    }

    auto allRadios = mClient->getRadioState();
    for (const auto& [frequency, state] : allRadios) {
        if (state.stationName == callsign) {
            sendMessage(requesterId,
                this->buildStationStateJson(callsign, static_cast<int>(frequency)).dump());
            return;
        }
    }

    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationStateUpdate);
    jsonMessage["value"]["callsign"] = callsign;
    jsonMessage["value"]["isAvailable"] = false;
    sendMessage(requesterId, jsonMessage.dump());

    PLOG_ERROR << "Station " << callsign << " not found";
}

void SDK::handleGetMainVolume(uint64_t requesterId)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kMainVolumeChange);
    jsonMessage["value"]["volume"] = UserSession::currentMainVolume;
    sendMessage(requesterId, jsonMessage.dump());
}

void SDK::handleAddStation(const nlohmann::json& json, uint64_t clientId)
{
    if (!mClient->IsVoiceConnected()) {
        PLOG_ERROR << "Voice must be connected before adding a station.";
        return;
    }

    if (!json.contains("value") || !json["value"].contains("callsign")) {
        PLOG_ERROR << "Callsign must be specified.";
        return;
    }

    try {
        auto callsign = json["value"]["callsign"].get<std::string>();
        auto allRadios = mClient->getRadioState();

        PLOG_INFO << "Adding callsign: " << callsign;

        // Check if station already exists
        for (const auto& [freq, state] : allRadios) {
            if (state.stationName == callsign) {
                sendMessage(clientId,
                    this->buildStationStateJson(state.stationName, static_cast<int>(freq)).dump());
                return;
            }
        }

        // Add new station
        mClient->GetStation(callsign);
    } catch (const nlohmann::json::exception& e) {
        PLOG_ERROR << "Failed to read the callsign: " << e.what();
    }
}

void SDK::handleChangeStationVolume(const nlohmann::json& json, uint64_t clientId)
{
    if (!mClient->IsVoiceConnected()) {
        PLOG_ERROR << "Voice must be connected before adding a station.";
        return;
    }

    if (!json.contains("value") || !json["value"].contains("frequency")
        || !json["value"].contains("amount")) {
        PLOG_ERROR << "Frequency and amount must be specified.";
        return;
    }

    try {
        auto frequency = json["value"]["frequency"].get<int>();
        auto amount = json["value"]["amount"].get<double>();
        auto allRadios = mClient->getRadioState();

        if (allRadios.find(frequency) == allRadios.end()) {
            PLOG_ERROR << "Frequency not found.";
            return;
        }

        auto currentVolume = RadioHelper::getRadioVolume(frequency);
        float newVolume = static_cast<float>(std::clamp(currentVolume + amount, 0.0, 100.0));

        RadioHelper::setRadioVolume(frequency, newVolume);

        // Get updated state and broadcast to all clients
        auto updatedRadios = mClient->getRadioState();
        auto radioState = updatedRadios[frequency];
        auto stateJson = this->buildStationStateJson(radioState.stationName, frequency);
        broadcastMessage(stateJson.dump(), MessageScope::AllWithElectron);

    } catch (const nlohmann::json::exception& e) {
        PLOG_ERROR << "Failed to process volume change: " << e.what();
    }
}

void SDK::handleChangeMainVolume(const nlohmann::json& json, uint64_t clientId)
{
    if (!mClient->IsVoiceConnected()) {
        PLOG_ERROR << "Voice must be connected to change volume.";
        return;
    }

    if (!json.contains("value") || !json["value"].contains("amount")) {
        PLOG_ERROR << "Amount must be specified.";
        return;
    }

    try {
        auto amount = json["value"]["amount"].get<double>();
        auto currentVolume = UserSession::currentMainVolume;
        float newVolume = static_cast<float>(std::clamp(currentVolume + amount, 0.0, 100.0));

        UserSession::currentMainVolume = newVolume;
        RadioHelper::setAllRadioVolumes();

        // Broadcast volume change to all clients
        this->publishMainVolumeChange(newVolume, true);

    } catch (const nlohmann::json::exception& e) {
        PLOG_ERROR << "Failed to change main volume: " << e.what();
    }
}

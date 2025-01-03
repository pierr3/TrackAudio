#include "sdk.hpp"
#include "Helpers.hpp"
#include "RadioHelper.hpp"
#include "Shared.hpp"
#include <plog/Log.h>

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
        PLOG_ERROR << "Error while starting SDK server: " << ex.what();
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
    this->broadcastOnWebsocket(jsonMessage.dump());
}

// NOLINTNEXTLINE
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

    if (event == sdk::types::Event::kRxEnd && callsign && frequencyHz && parameter3) {
        nlohmann::json jsonMessage = WebsocketMessage::buildMessage(WebsocketMessageType::kRxEnd);
        jsonMessage["value"]["callsign"] = *callsign;
        jsonMessage["value"]["pFrequencyHz"] = *frequencyHz;
        jsonMessage["value"]["lastRx"] = *parameter3;
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
            PLOG_ERROR << "kStationStateUpdated requires a frequencyHz";
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
        [&](const auto& req, auto /*params*/) { return SDK::handleTransmittingSDKCall(req); });

    router->http_get(routeMap[sdkCall::kRx],
        [&](const auto& req, auto /*params*/) { return this->handleRxSDKCall(req); });

    router->http_get(routeMap[sdkCall::kTx],
        [&](const auto& req, auto /*params*/) { return this->handleTxSDKCall(req); });

    router->http_get(routeMap[sdkCall::kWebSocket],
        [&](const auto& req, auto /*params*/) { return handleWebSocketSDKCall(req); });

    router->non_matched_request_handler(
        [](const auto& req) { return req->create_response().set_body(CLIENT_NAME).done(); });

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

// NOLINTNEXTLINE(readability-function-cognitive-complexity)
void SDK::handleSetStationState(const nlohmann::json& json)
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
    }
    // Special case for when the rx message is provided and set to false, which should
    // force the tx value to false as well.
    else if (json["value"].contains("rx") && !radioState.rx) {
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

void SDK::handleGetStationStates()
{
    std::vector<nlohmann::json> stationStates;

    // Collect the states for all the radios
    auto allRadios = mClient->getRadioState();
    stationStates.reserve(allRadios.size());
    for (const auto& [frequency, state] : allRadios) {
        stationStates.push_back(
            this->buildStationStateJson(state.stationName, static_cast<int>(frequency)));
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
        PLOG_ERROR << "kGetStationState requires a voice connection";
        return;
    }

    // Look for the station and if found send the state.
    auto allRadios = mClient->getRadioState();
    for (const auto& [frequency, state] : allRadios) {
        if (state.stationName == callsign) {
            this->publishStationState(
                this->buildStationStateJson(callsign, static_cast<int>(frequency)));
            return;
        }
    }

    // Since the station wasn't found send a kGetStationState message with isAvailable false
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationStateUpdate);

    jsonMessage["value"]["callsign"] = callsign;
    jsonMessage["value"]["isAvailable"] = false;
    this->publishStationState(jsonMessage);

    PLOG_ERROR << "Station " << callsign << " not found";
}

void SDK::publishMainOutputVolumeChange(const float& volume, bool broadcastToElectron)
{

    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kMainOutputVolumeChange);

    jsonMessage["value"]["volume"] = volume;

    this->broadcastOnWebsocket(jsonMessage.dump());
    if (broadcastToElectron) {
        NapiHelpers::callElectron("main-output-volume-change", jsonMessage.dump());
    }
}

void SDK::publishStationState(const nlohmann::json& state)
{
    this->broadcastOnWebsocket(state.dump());
    NapiHelpers::callElectron("station-state-update", state.dump());
}

void SDK::publishStationAdded(const std::string& callsign, const int& frequencyHz)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kStationAdded);

    jsonMessage["value"]["callsign"] = callsign;
    jsonMessage["value"]["frequency"] = frequencyHz;

    this->broadcastOnWebsocket(jsonMessage.dump());
}

void SDK::publishFrequencyRemoved(const int& frequencyHz)
{
    nlohmann::json jsonMessage
        = WebsocketMessage::buildMessage(WebsocketMessageType::kFrequencyRemoved);

    jsonMessage["value"]["frequency"] = frequencyHz;

    this->broadcastOnWebsocket(jsonMessage.dump());
}

void SDK::handleIncomingWebSocketRequest(const std::string& payload)
{
    try {
        auto json = nlohmann::json::parse(payload);
        std::string messageType = json["type"];

        if (messageType == "kSetStationState") {
            this->handleSetStationState(json);
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
        if (messageType == "kGetMainOutputVolume") {
            this->handleGetMainOutputVolume();
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
        if (messageType == "kGetVoiceConnectedState") {
            this->handleVoiceConnectedEventForWebsocket(mClient->IsVoiceConnected());
            return;
        }
        if (messageType == "kAddStation") {
            this->handleAddStation(json);
            return;
        }
        if (messageType == "kChangeStationVolume") {
            this->handleChangeStationVolume(json);
            return;
        }
        if (messageType == "kChangeMainOutputVolume") {
            this->handleChangeMainOutputVolume(json);
            return;
        }
    } catch (const std::exception& e) {
        // Handle JSON parsing error
        PLOG_ERROR << "Error parsing incoming message JSON: " << e.what();
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
                this->handleIncomingWebSocketRequest(message->payload());
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
            PLOG_ERROR << "Error while sending message to websocket: " << ex.what();
        }
    }
};

void SDK::handleGetMainOutputVolume()
{
    this->publishMainOutputVolumeChange(UserSession::currentMainOutputVolume, false);
}

void SDK::handleChangeMainOutputVolume(const nlohmann::json& json)
{
    if (!mClient->IsVoiceConnected()) {
        PLOG_ERROR << "Voice must be connected before adding a station.";
        return;
    }

    if (!json.contains("value") || !json["value"].contains("amount")) {
        PLOG_ERROR << "Amount must be specified.";
        return;
    }

    try {
        auto amount = json["value"]["amount"].get<double>();
        auto currentVolume = UserSession::currentMainOutputVolume;
        float newVolume;

        newVolume = static_cast<float>(std::clamp(currentVolume + amount, 0.0, 100.0));

        UserSession::currentMainOutputVolume = newVolume;
        RadioHelper::setAllRadioVolumes();
        this->publishMainOutputVolumeChange(newVolume);

    } catch (const nlohmann::json::exception& e) {
        PLOG_ERROR << "Failed to read the amount: " << e.what();
    }
}

void SDK::handleChangeStationVolume(const nlohmann::json& json)
{
    if (!mClient->IsVoiceConnected()) {
        PLOG_ERROR << "Voice must be connected before adding a station.";
        return;
    }
    if (!json.contains("value") || !json["value"].contains("frequency")
        || !json["value"].contains("amount")) {
        PLOG_ERROR << "Frequency must be specified.";
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
        float newGain;

        newGain = static_cast<float>(std::clamp(currentVolume + amount, 0.0, 100.0));

        RadioHelper::setRadioVolume(frequency, newGain);

        // Get the updated radio state and publish it
        auto updatedRadios = mClient->getRadioState();
        auto radioState = updatedRadios[frequency];
        auto stateJson = this->buildStationStateJson(radioState.stationName, frequency);
        this->publishStationState(stateJson);

    } catch (const nlohmann::json::exception& e) {
        PLOG_ERROR << "Failed to read the frequency: " << e.what();
    }
}

void SDK::handleAddStation(const nlohmann::json& json)
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

        // See if the station or frequency is already added. if yes, just publish the current
        // state and return.
        for (const auto& [freq, state] : allRadios) {
            if (state.stationName == callsign) {
                this->publishStationState(
                    this->buildStationStateJson(state.stationName, static_cast<int>(freq)));
                return;
            }
        }

        // Since it wasn't already added, add it.
        mClient->GetStation(callsign);
    } catch (const nlohmann::json::exception& e) {
        PLOG_ERROR << "Failed to read the callsign: " << e.what();
    }
}

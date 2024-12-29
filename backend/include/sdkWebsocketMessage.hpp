#pragma once
#include "Helpers.hpp"
#include <map>
#include <nlohmann/detail/macro_scope.hpp>
#include <nlohmann/json.hpp>
#include <string>
#include <utility>

namespace sdk::types {
enum class WebsocketMessageType : std::uint8_t {
    kRxBegin,
    kRxEnd,
    kTxBegin,
    kTxEnd,
    kFrequencyStateUpdate,
    kStationStateUpdate,
    kStationStates,
    kVoiceConnectedState,
    kFrequencyRemoved,
    kStationAdded,
    kAddStation
};

inline const std::map<WebsocketMessageType, std::string>& getWebsocketMessageTypeMap()
{
    static const std::map<WebsocketMessageType, std::string> kWebsocketMessageTypeMap {
        { WebsocketMessageType::kRxBegin, "kRxBegin" },
        { WebsocketMessageType::kRxEnd, "kRxEnd" },
        { WebsocketMessageType::kTxBegin, "kTxBegin" },
        { WebsocketMessageType::kTxEnd, "kTxEnd" },
        { WebsocketMessageType::kFrequencyStateUpdate, "kFrequencyStateUpdate" },
        { WebsocketMessageType::kStationStates, "kStationStates" },
        { WebsocketMessageType::kStationStateUpdate, "kStationStateUpdate" },
        { WebsocketMessageType::kVoiceConnectedState, "kVoiceConnectedState" },
        { WebsocketMessageType::kFrequencyRemoved, "kFrequencyRemoved" },
        { WebsocketMessageType::kStationAdded, "kStationAdded" },
        { WebsocketMessageType::kAddStation, "kAddStation" },
    };
    return kWebsocketMessageTypeMap;
}

class WebsocketMessage {
public:
    std::string type;
    nlohmann::json value;

    explicit WebsocketMessage(std::string type)
        : type(std::move(type))
        , value({})
    {
    }

    static WebsocketMessage buildMessage(WebsocketMessageType messageType)
    {
        const std::string& typeString = getWebsocketMessageTypeMap().at(messageType);
        return WebsocketMessage(typeString);
    }

    NLOHMANN_DEFINE_TYPE_INTRUSIVE(WebsocketMessage, type, value);
};

} // namespace sdk::types

namespace ns {
class Station {
public:
    [[nodiscard]] int getFrequencyHz() const { return pFrequencyHz; }
    [[nodiscard]] const std::string& getCallsign() const { return pCallsign; }
    [[nodiscard]] const std::string& getHumanFrequency() const { return pHumanFreq; }

    [[nodiscard]] int getTransceiverCount() const { return pTransceiverCount; }
    [[nodiscard]] bool hasTransceiver() const { return pTransceiverCount > 0; }
    void setTransceiverCount(int count) { pTransceiverCount = count; }

    static Station build(const std::string& callsign, int freqHz)
    {
        Station station;
        station.pCallsign = callsign;
        station.pFrequencyHz = freqHz;

        station.pHumanFreq = Helpers::ConvertHzToHumanString(freqHz);

        return station;
    }

    NLOHMANN_DEFINE_TYPE_INTRUSIVE(Station, pCallsign, pFrequencyHz);

protected:
    int pFrequencyHz = 0;
    std::string pCallsign;
    std::string pHumanFreq;

    int pTransceiverCount = -1;
};
} // namespace ns

// Example of kRxBegin message:
// @type the type of the message
// @value the callsign of the station (pilot or ATC) who started transmitting
// the radio, and the frequency which is being transmitted on JSON: {"type":
// "kRxBegin", "value": {"callsign": "AFR001", "pFrequencyHz": 123000000}}

// Example of kRxEnd message:
// @type the type of the message
// @value the callsign of the station (pilot or ATC) who stopped transmitting
// the radio, and the frequency which was being transmitted on JSON: {"type":
// "kRxEnd", "value": {"callsign": "AFR001", "pFrequencyHz": 123000000}}

//
// Example of kFrequencyStateUpdate message:
// @type the type of the message
// @value the frequency state update information including rx, tx, and xc
// stations
// JSON: {"type": "kFrequencyStateUpdate", "value": {"rx":
// [{"pFrequencyHz": 118775000, "pCallsign": "EDDF_S_TWR"}], "tx":
// [{"pFrequencyHz": 119775000, "pCallsign": "EDDF_S_TWR"}], "xc":
// [{"pFrequencyHz": 121500000, "pCallsign": "EDDF_S_TWR"}]}}

// Example of kTxBegin message:
// @type the type of the message
// JSON: {"type": "kTxBegin", "value": {}}

// Example of kTxEnd message:
// @type the type of the message
// JSON: {"type": "kTxEnd", "value": {}}

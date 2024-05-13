#pragma once
#include <map>
#include <nlohmann/detail/macro_scope.hpp>
#include <nlohmann/json.hpp>
#include <string>
#include <utility>

namespace sdk::types {
enum class WebsocketMessageType { kRxBegin, kRxEnd, kTxBegin, kTxEnd, kFrequencyStateUpdate };

inline const std::map<WebsocketMessageType, std::string>& getWebsocketMessageTypeMap()
{
    static const std::map<WebsocketMessageType, std::string> kWebsocketMessageTypeMap {
        { WebsocketMessageType::kRxBegin, "kRxBegin" }, { WebsocketMessageType::kRxEnd, "kRxEnd" },
        { WebsocketMessageType::kTxBegin, "kTxBegin" }, { WebsocketMessageType::kTxEnd, "kTxEnd" },
        { WebsocketMessageType::kFrequencyStateUpdate, "kFrequencyStateUpdate" }
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
    [[nodiscard]] inline int getFrequencyHz() const { return pFrequencyHz; }
    [[nodiscard]] inline const std::string& getCallsign() const { return pCallsign; }
    [[nodiscard]] inline const std::string& getHumanFrequency() const { return pHumanFreq; }

    [[nodiscard]] inline int getTransceiverCount() const { return pTransceiverCount; }
    [[nodiscard]] inline bool hasTransceiver() const { return pTransceiverCount > 0; }
    inline void setTransceiverCount(int count) { pTransceiverCount = count; }

    inline static Station build(const std::string& callsign, int freqHz)
    {
        Station station;
        station.pCallsign = callsign;
        station.pFrequencyHz = freqHz;

        std::string temp = std::to_string(freqHz / 1000);
        station.pHumanFreq = temp.substr(0, 3) + "." + temp.substr(3, 7);

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
// @value the frequencies which are being transmitted on
// JSON: {"type": "kTxBegin", "value": {"pFrequenciesHz": [123000000, 118000000]}}

// Example of kTxEnd message:
// @type the type of the message
// @value the frequencies which were being transmitted on
// JSON: {"type": "kTxEnd", "value": {"pFrequenciesHz": [123000000, 118000000]}}
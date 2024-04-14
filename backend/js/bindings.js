exports.TrackAudioAfv = require("bindings")("trackaudio-afv");
exports.AFVEventTypes = {
    Error: "error",
    VoiceConnected: "VoiceConnected",
    VoiceDisconnected: "VoiceDisconnected",
    StationTransceiversUpdated: "StationTransceiversUpdated",
    StationDataReceived: "StationDataReceived",
    FrequencyRxBegin: "FrequencyRxBegin",
    FrequencyRxEnd: "FrequencyRxEnd",
    PttState: "PttState",
    NetworkConnected: "network-connected",
    NetworkDisconnected: "network-disconnected",
  };
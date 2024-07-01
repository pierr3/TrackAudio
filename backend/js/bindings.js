exports.TrackAudioAfv = require("bindings")("trackaudio-afv");
exports.AfvEventTypes = {
  Error: "error",
  VoiceConnected: "VoiceConnected",
  VoiceDisconnected: "VoiceDisconnected",
  StationTransceiversUpdated: "StationTransceiversUpdated",
  StationDataReceived: "StationDataReceived",
  FrequencyRxBegin: "FrequencyRxBegin",
  FrequencyRxEnd: "FrequencyRxEnd",
  StationRxBegin: "StationRxBegin",
  PttState: "PttState",
  VuMeter: "VuMeter",
  NetworkConnected: "network-connected",
  NetworkDisconnected: "network-disconnected",
  PttKeySet: "UpdatePttKeyName",
  StationStateUpdate: "station-state-update",
};

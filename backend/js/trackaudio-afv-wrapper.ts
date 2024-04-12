import type { TrackAudioAfv } from "./trackaudio-afv";

export enum AFVEventTypes {
  Error = "error",
  VoiceConnected = "VoiceConnected",
  VoiceDisconnected = "VoiceDisconnected",
  StationTransceiversUpdated = "StationTransceiversUpdated",
  StationDataReceived = "StationDataReceived",
  FrequencyRxBegin = "FrequencyRxBegin",
  FrequencyRxEnd = "FrequencyRxEnd",
  PttState = "PttState",
  NetworkConnected = "network-connected",
  NetworkDisconnected = "network-disconnected",
}

const afv: TrackAudioAfv = require("../build/Release/trackaudio-afv.node");

export default afv;

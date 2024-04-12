#pragma once
#ifndef AFV_NATIVE_API_H
#define AFV_NATIVE_API_H

#ifdef AFV_NATIVE_STATIC_DEFINE
#  define AFV_NATIVE_API
#  define AFV_NATIVE_NO_EXPORT
#else
        #ifndef AFV_NATIVE_API
                #ifdef afv_native_EXPORTS
                /* We are building this library */
                #if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
                        #define AFV_NATIVE_API __declspec(dllexport)
                #else
                        #define AFV_NATIVE_API __attribute__((visibility("default")))
                #endif    
        #else
                /* We are using this library */
                #if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
                        #define AFV_NATIVE_API __declspec(dllimport)
                #else
                        #define AFV_NATIVE_API __attribute__((visibility("default")))
                #endif
        #endif
#    endif
#  endif

#  ifndef AFV_NATIVE_NO_EXPORT
        #if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
                #define AFV_NATIVE_NO_EXPORT __declspec(dllexport)
        #else
               #define AFV_NATIVE_NO_EXPORT __attribute__((visibility("hidden")))
        #endif
#endif

#ifndef AFV_NATIVE_DEPRECATED
        #if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
                #define AFV_NATIVE_DEPRECATED __declspec(deprecated)
        #else
                #define AFV_NATIVE_DEPRECATED __attribute__ ((__deprecated__))
        #endif
#endif

#ifndef AFV_NATIVE_DEPRECATED_EXPORT
#  define AFV_NATIVE_DEPRECATED_EXPORT AFV_NATIVE_API AFV_NATIVE_DEPRECATED
#endif

#ifndef AFV_NATIVE_DEPRECATED_NO_EXPORT
#  define AFV_NATIVE_DEPRECATED_NO_EXPORT AFV_NATIVE_NO_EXPORT AFV_NATIVE_DEPRECATED
#endif

#if 0 /* DEFINE_NO_DEPRECATED */
#  ifndef AFV_NATIVE_NO_DEPRECATED
#    define AFV_NATIVE_NO_DEPRECATED
#  endif
#endif

#endif /* AFV_NATIVE_API_H */
#include <functional>
#include <map>
#include <string>
#include <vector>
/* event.h
 *
 * This file is part of AFV-Native.
 *
 * Copyright (c) 2019 Christopher Collins
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

#ifndef AFV_NATIVE_EVENT_H
#define AFV_NATIVE_EVENT_H

namespace afv_native {
    enum class ClientEventType {
        APIServerConnected,
        APIServerDisconnected,
        APIServerError, // data is a pointer to the APISessionError
        VoiceServerConnected,
        VoiceServerDisconnected,
        VoiceServerChannelError, // data is a pointer to an int containing the errno
        VoiceServerError,        // data is a pointer to the VoiceSessionError
        PttOpen,
        PttClosed,
        StationAliasesUpdated,
        StationTransceiversUpdated,
        FrequencyRxBegin,      // data is a pointer to an unsigned int containing the frequency
        FrequencyRxEnd,    // data is a pointer to an unsigned int containing the frequency
        StationRxBegin, // data is a pointer to an unsigned int containing the frequency, data2 is pointer to char* containing callsign
        StationRxEnd, // data is a pointer to an unsigned int containing the frequency, data2 is pointer to char* containing callsign
        AudioError,
        VccsReceived,
        StationDataReceived,
        InputDeviceError,
        AudioDisabled,
        AudioDeviceStoppedError, // data is a pointer to a std::string of the relevant device name
    };

    namespace afv {
        enum class APISessionState {
            Disconnected, /// Disconnected state is not authenticated, nor trying to authenticate.
            Connecting, /// Connecting means we've started our attempt to authenticate and may be waiting for a response from the API Server
            Running, /// Running means we have a valid authentication token and can send updates to the API server
            Reconnecting, /// Reconnecting means our token has expired and we're still trying to renew it.
            Error /// Error is only used in the state callback, and is used to inform the callback user that an error that resulted in a disconnect occured.
        };

        enum class APISessionError {
            NoError = 0,
            ConnectionError,                // local socket or curl error - see data returned.
            BadRequestOrClientIncompatible, // APIServer 400
            RejectedCredentials,            // APIServer 403
            BadPassword,                    // APIServer 401
            OtherRequestError,
            InvalidAuthToken,          // local parse error
            AuthTokenExpiryTimeInPast, // local parse error
        };
    } // namespace afv
} // namespace afv_native

#endif // AFV_NATIVE_EVENT_H
#ifndef AFV_NATIVE_HARDWARE_H
#define AFV_NATIVE_HARDWARE_H

namespace afv_native {
    enum class HardwareType {
        Schmid_ED_137B,
        Rockwell_Collins_2100,
        Garex_220
    };

    enum class PlaybackChannel {
        Both,
        Left,
        Right
    };
} // namespace afv_native

#endif // AFV_NATIVE_HARDWARE_H
// --- REMOVE ABOVE BEFORE PUBLISHING ---

namespace afv_native {
    typedef void (*log_fn)(const char *subsystem, const char *file, int line, const char *lineOut);
    typedef std::function<void(std::string subsystem, std::string file, int line, std::string lineOut)> modern_log_fn;

    struct SimpleAtcRadioState {
        bool            tx;
        bool            rx;
        bool            xc;
        bool            onHeadset;
        unsigned int    Frequency;
        std::string     stationName       = "";
        HardwareType    simulatedHardware = HardwareType::Schmid_ED_137B;
        bool            isATIS            = false;
        PlaybackChannel playbackChannel   = PlaybackChannel::Both;

        std::string lastTransmitCallsign = "";
    };
} // namespace afv_native

namespace afv_native::api {
    AFV_NATIVE_API void setLogger(afv_native::modern_log_fn gLogger);

    struct AFV_NATIVE_API AudioInterface {
        std::string id;
        std::string name;
        bool        isDefault;
    };

    class atcClient {
      public:
        AFV_NATIVE_API atcClient(std::string clientName, std::string resourcePath = "");
        AFV_NATIVE_API ~atcClient();

        AFV_NATIVE_API bool IsInitialized();

        AFV_NATIVE_API void SetCredentials(std::string username, std::string password);

        AFV_NATIVE_API void SetCallsign(std::string callsign);
        AFV_NATIVE_API void SetClientPosition(double lat, double lon, double amslm, double aglm);

        AFV_NATIVE_API bool IsVoiceConnected();
        AFV_NATIVE_API bool IsAPIConnected();

        AFV_NATIVE_API bool Connect();
        AFV_NATIVE_API void Disconnect();

        AFV_NATIVE_API void SetAudioApi(unsigned int api);
        AFV_NATIVE_API std::map<unsigned int, std::string> GetAudioApis();

        AFV_NATIVE_API void SetAudioInputDevice(std::string inputDevice);
        AFV_NATIVE_API std::vector<AudioInterface> GetAudioInputDevices(unsigned int mAudioApi);
        AFV_NATIVE_API std::string GetDefaultAudioInputDevice(unsigned int mAudioApi);
        AFV_NATIVE_API void SetAudioOutputDevice(std::string outputDevice);
        AFV_NATIVE_API void SetAudioSpeakersOutputDevice(std::string outputDevice);
        AFV_NATIVE_API std::vector<AudioInterface> GetAudioOutputDevices(unsigned int mAudioApi);
        AFV_NATIVE_API std::string GetDefaultAudioOutputDevice(unsigned int mAudioApi);

        AFV_NATIVE_API double GetInputPeak() const;
        AFV_NATIVE_API double GetInputVu() const;

        AFV_NATIVE_API void SetEnableInputFilters(bool enableInputFilters);
        AFV_NATIVE_API void SetEnableOutputEffects(bool enableEffects);
        AFV_NATIVE_API bool GetEnableInputFilters() const;

        AFV_NATIVE_API void StartAudio();
        AFV_NATIVE_API void StopAudio();
        AFV_NATIVE_API bool IsAudioRunning();

        AFV_NATIVE_API void SetTx(unsigned int freq, bool active);
        AFV_NATIVE_API void SetRx(unsigned int freq, bool active);
        AFV_NATIVE_API void SetXc(unsigned int freq, bool active);
        AFV_NATIVE_API void SetOnHeadset(unsigned int freq, bool active);

        AFV_NATIVE_API bool GetTxActive(unsigned int freq);
        AFV_NATIVE_API bool GetRxActive(unsigned int freq);
        AFV_NATIVE_API bool GetOnHeadset(unsigned int freq);

        AFV_NATIVE_API bool GetTxState(unsigned int freq);
        AFV_NATIVE_API bool GetRxState(unsigned int freq);
        AFV_NATIVE_API bool GetXcState(unsigned int freq);

        // Use this to set the current transceivers to the transceivers from this station, pulled from the AFV database, only one at a time can be active
        AFV_NATIVE_API void UseTransceiversFromStation(std::string station, int freq);

        AFV_NATIVE_API void FetchTransceiverInfo(std::string station);
        AFV_NATIVE_API void FetchStationVccs(std::string station);
        AFV_NATIVE_API void GetStation(std::string station);

        AFV_NATIVE_API int GetTransceiverCountForStation(std::string station);
        AFV_NATIVE_API int GetTransceiverCountForFrequency(unsigned int freq);

        AFV_NATIVE_API void SetPtt(bool pttState);

        AFV_NATIVE_API void SetAtisRecording(bool state);
        AFV_NATIVE_API bool IsAtisRecording();

        AFV_NATIVE_API void SetAtisListening(bool state);
        AFV_NATIVE_API bool IsAtisListening();

        AFV_NATIVE_API void StartAtisPlayback(std::string callsign, unsigned int freq);
        AFV_NATIVE_API void StopAtisPlayback();
        AFV_NATIVE_API bool IsAtisPlayingBack();

        AFV_NATIVE_API std::string LastTransmitOnFreq(unsigned int freq);

        AFV_NATIVE_API void SetRadioGainAll(float gain);
        AFV_NATIVE_API void SetRadioGain(unsigned int freq, float gain);

        // Sets the playback channel for all channels and saves it to be used in the future for new channels
        AFV_NATIVE_API void SetPlaybackChannelAll(PlaybackChannel channel);
        // Sets the playback channel for a single channel
        AFV_NATIVE_API void SetPlaybackChannel(unsigned int freq, PlaybackChannel channel);
        AFV_NATIVE_API int GetPlaybackChannel(unsigned int freq);

        AFV_NATIVE_API bool AddFrequency(unsigned int freq, std::string stationName = "");
        AFV_NATIVE_API void RemoveFrequency(unsigned int freq);
        AFV_NATIVE_API bool IsFrequencyActive(unsigned int freq);
        AFV_NATIVE_API std::map<unsigned int, SimpleAtcRadioState> getRadioState();

        AFV_NATIVE_API void reset();

        AFV_NATIVE_API void SetHardware(afv_native::HardwareType hardware);

        AFV_NATIVE_API void RaiseClientEvent(std::function<void(afv_native::ClientEventType, void *, void *)> callback);

        //
        // Deprecated functions
        //
        [[deprecated("Use SetPlaybackChannelAll instead")]] AFV_NATIVE_DEPRECATED void SetHeadsetOutputChannel(int channel);
        [[deprecated("Use SetRadioGainAll instead")]] AFV_NATIVE_DEPRECATED void SetRadiosGain(float gain);
        [[deprecated("Use modern afv_native::api::setLogger() instead")]] AFV_NATIVE_DEPRECATED static void setLogger(afv_native::log_fn gLogger);
    };
} // namespace afv_native::api
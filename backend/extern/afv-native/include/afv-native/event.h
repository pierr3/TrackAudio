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

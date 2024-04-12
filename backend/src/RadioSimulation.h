#pragma once
#include <algorithm>
#include <cmath>

class RadioSimulation {
public:
    // From
    // https://github.com/swift-project/pilotclient/blob/main/src/blackmisc/aviation/comsystem.cpp
    // Under GPL v3 License

    /*
     * Validates whether the given frequency is a valid 8.33kHz channel.
     * @param fKHz The frequency in kHz.
     * @return True if the frequency is a valid 8.33kHz channel, false
     * otherwise.
     */
    static inline bool isValid8_33kHzChannel(int fKHz)
    {
        const int lastDigits = static_cast<int>(fKHz) % 100;
        return fKHz % 5 == 0 && lastDigits != 20 && lastDigits != 45
            && lastDigits != 70 && lastDigits != 95;
    }

    /*
     * Rounds the given frequency to the nearest valid 8.33kHz channel.
     * @param fKHz The frequency in kHz.
     * @return The rounded frequency in kHz.
     */
    static inline int round8_33kHzChannel(int fKHz)
    {
        fKHz = fKHz / 1000;
        if (!isValid8_33kHzChannel(fKHz)) {
            const int diff = static_cast<int>(fKHz) % 5;
            int lower = fKHz - diff;
            if (!isValid8_33kHzChannel(lower)) {
                lower -= 5;
            }

            int upper = fKHz + (5 - diff);
            if (!isValid8_33kHzChannel(upper)) {
                upper += 5;
            }

            const int lowerDiff = abs(fKHz - lower);
            const int upperDiff = abs(fKHz - upper);

            fKHz = lowerDiff < upperDiff ? lower : upper;
            fKHz = std::clamp(fKHz, 118000, 136990);
        }
        return fKHz * 1000;
    }
};
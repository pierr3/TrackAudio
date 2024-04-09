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
        Right,
        Default
    };
} // namespace afv_native

#endif // AFV_NATIVE_HARDWARE_H

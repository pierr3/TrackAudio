#include <string>
#include <uiohook.h>
#include <unordered_map>
class KeycodeLookup {

public:
    static std::string getKeyName(uint16_t keyCode)
    {
        auto it = keyCodeMap.find(keyCode);
        if (it != keyCodeMap.end()) {
            return it->second;
        }
        return "Unknown";
    }

private:
    static inline const std::unordered_map<uint16_t, std::string> keyCodeMap = {
        { VC_ESCAPE, "Escape" }, { VC_F1, "F1" }, { VC_F2, "F2" }, { VC_F3, "F3" }, { VC_F4, "F4" },
        { VC_F5, "F5" }, { VC_F6, "F6" }, { VC_F7, "F7" }, { VC_F8, "F8" }, { VC_F9, "F9" },
        { VC_F10, "F10" }, { VC_F11, "F11" }, { VC_F12, "F12" }, { VC_F13, "F13" },
        { VC_F14, "F14" }, { VC_F15, "F15" }, { VC_F16, "F16" }, { VC_F17, "F17" },
        { VC_F18, "F18" }, { VC_F19, "F19" }, { VC_F20, "F20" }, { VC_F21, "F21" },
        { VC_F22, "F22" }, { VC_F23, "F23" }, { VC_F24, "F24" }, { VC_BACK_QUOTE, "Backquote" },
        { VC_0, "0" }, { VC_1, "1" }, { VC_2, "2" }, { VC_3, "3" }, { VC_4, "4" }, { VC_5, "5" },
        { VC_6, "6" }, { VC_7, "7" }, { VC_8, "8" }, { VC_9, "9" }, { VC_MINUS, "Minus" },
        { VC_EQUALS, "Equal" }, { VC_BACKSPACE, "Backspace" }, { VC_TAB, "Tab" },
        { VC_CAPS_LOCK, "CapsLock" }, { VC_A, "A" }, { VC_B, "B" }, { VC_C, "C" }, { VC_D, "D" },
        { VC_E, "E" }, { VC_F, "F" }, { VC_G, "G" }, { VC_H, "H" }, { VC_I, "I" }, { VC_J, "J" },
        { VC_K, "K" }, { VC_L, "L" }, { VC_M, "M" }, { VC_N, "N" }, { VC_O, "O" }, { VC_P, "P" },
        { VC_Q, "Q" }, { VC_R, "R" }, { VC_S, "S" }, { VC_T, "T" }, { VC_U, "U" }, { VC_V, "V" },
        { VC_W, "W" }, { VC_X, "X" }, { VC_Y, "Y" }, { VC_Z, "Z" },
        { VC_OPEN_BRACKET, "BracketLeft" }, { VC_CLOSE_BRACKET, "BracketRight" },
        { VC_BACK_SLASH, "Backslash" }, { VC_SEMICOLON, "Semicolon" }, { VC_QUOTE, "Quote" },
        { VC_ENTER, "Enter" }, { VC_COMMA, "Comma" }, { VC_PERIOD, "Period" },
        { VC_SLASH, "Slash" }, { VC_SPACE, "Space" }, { VC_PRINT_SCREEN, "PrintScreen" },
        { VC_SCROLL_LOCK, "ScrollLock" }, { VC_PAUSE, "Pause" }, { VC_INSERT, "Insert" },
        { VC_DELETE, "Delete" }, { VC_HOME, "Home" }, { VC_END, "End" }, { VC_PAGE_UP, "PageUp" },
        { VC_PAGE_DOWN, "PageDown" }, { VC_UP, "ArrowUp" }, { VC_LEFT, "ArrowLeft" },
        { VC_RIGHT, "ArrowRight" }, { VC_DOWN, "ArrowDown" }, { VC_NUM_LOCK, "NumLock" },
        { VC_KP_DIVIDE, "NumpadDivide" }, { VC_KP_MULTIPLY, "NumpadMultiply" },
        { VC_KP_SUBTRACT, "NumpadSubtract" }, { VC_KP_ADD, "NumpadAdd" },
        { VC_KP_ENTER, "NumpadEnter" }, { VC_KP_DECIMAL, "NumpadDecimal" }, { VC_KP_0, "Numpad0" },
        { VC_KP_1, "Numpad1" }, { VC_KP_2, "Numpad2" }, { VC_KP_3, "Numpad3" },
        { VC_KP_4, "Numpad4" }, { VC_KP_5, "Numpad5" }, { VC_KP_6, "Numpad6" },
        { VC_KP_7, "Numpad7" }, { VC_KP_8, "Numpad8" }, { VC_KP_9, "Numpad9" },
        { VC_SHIFT_L, "ShiftLeft" }, { VC_SHIFT_R, "ShiftRight" }, { VC_CONTROL_L, "ControlLeft" },
        { VC_CONTROL_R, "ControlRight" }, { VC_ALT_L, "AltLeft" }, { VC_ALT_R, "AltRight" },
        { VC_META_L, "MetaLeft" }, { VC_META_R, "MetaRight" }, { VC_CONTEXT_MENU, "ContextMenu" },
        { VC_POWER, "Power" }, { VC_SLEEP, "Sleep" }, { VC_WAKE, "Wake" },
        { VC_MEDIA_PLAY, "MediaPlay" }, { VC_MEDIA_STOP, "MediaStop" },
        { VC_MEDIA_PREVIOUS, "MediaPrevious" }, { VC_MEDIA_NEXT, "MediaNext" },
        { VC_MEDIA_SELECT, "MediaSelect" }, { VC_MEDIA_EJECT, "MediaEject" },
        { VC_VOLUME_MUTE, "VolumeMute" }, { VC_VOLUME_DOWN, "VolumeDown" },
        { VC_VOLUME_UP, "VolumeUp" }, { VC_APP_BROWSER, "AppBrowser" },
        { VC_APP_CALCULATOR, "AppCalculator" }, { VC_APP_MAIL, "AppMail" },
        { VC_APP_MUSIC, "AppMusic" }, { VC_APP_PICTURES, "AppPictures" },
        { VC_BROWSER_SEARCH, "BrowserSearch" }, { VC_BROWSER_HOME, "BrowserHome" },
        { VC_BROWSER_BACK, "BrowserBack" }, { VC_BROWSER_FORWARD, "BrowserForward" },
        { VC_BROWSER_STOP, "BrowserStop" }, { VC_BROWSER_REFRESH, "BrowserRefresh" },
        { VC_BROWSER_FAVORITES, "BrowserFavorites" }
    };
};

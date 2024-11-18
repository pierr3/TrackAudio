// KeycodeLookup.h
#pragma once
#include <string>
#include <uiohook.h>
#include <unordered_map>

class KeycodeLookup {
public:
    static std::string getKeyName(uint16_t keyCode)
    {
#if defined(_WIN32)
        auto it = windowsKeyMap.find(keyCode);
        if (it != windowsKeyMap.end()) {
            return it->second;
        }
#elif defined(__APPLE__)
        auto it = macKeyMap.find(keyCode);
        if (it != macKeyMap.end()) {
            return it->second;
        }
#elif defined(__linux__)
        auto it = linuxKeyMap.find(keyCode);
        if (it != linuxKeyMap.end()) {
            return it->second;
        }
#endif

        auto commonIt = commonKeyMap.find(keyCode);
        if (commonIt != commonKeyMap.end()) {
            return commonIt->second;
        }

        return "Unknown(" + std::to_string(keyCode) + ")";
    }

private:
    static inline const std::unordered_map<uint16_t, std::string> commonKeyMap = {
        // Function keys
        { VC_F1, "F1" }, { VC_F2, "F2" }, { VC_F3, "F3" }, { VC_F4, "F4" }, { VC_F5, "F5" },
        { VC_F6, "F6" }, { VC_F7, "F7" }, { VC_F8, "F8" }, { VC_F9, "F9" }, { VC_F10, "F10" },
        { VC_F11, "F11" }, { VC_F12, "F12" }, { VC_F13, "F13" }, { VC_F14, "F14" },
        { VC_F15, "F15" }, { VC_F16, "F16" }, { VC_F17, "F17" }, { VC_F18, "F18" },
        { VC_F19, "F19" }, { VC_F20, "F20" }, { VC_F21, "F21" }, { VC_F22, "F22" },
        { VC_F23, "F23" }, { VC_F24, "F24" },

        // Number row
        { VC_1, "1" }, { VC_2, "2" }, { VC_3, "3" }, { VC_4, "4" }, { VC_5, "5" }, { VC_6, "6" },
        { VC_7, "7" }, { VC_8, "8" }, { VC_9, "9" }, { VC_0, "0" },

        // Symbols as they appear on keyboard
        { VC_BACK_QUOTE, "`" }, { VC_MINUS, "-" }, { VC_EQUALS, "=" },
        { VC_OPEN_BRACKET, "Left [" }, { VC_CLOSE_BRACKET, "Right ]" }, { VC_BACK_SLASH, "\\" },
        { VC_SEMICOLON, ";" }, { VC_QUOTE, "'" }, { VC_COMMA, "," }, { VC_PERIOD, "." },
        { VC_SLASH, "/" },

        // Shifted symbols
        { VC_PLUS, "+" }, { VC_ASTERISK, "*" }, { VC_AT, "@" }, { VC_AMPERSAND, "&" },
        { VC_DOLLAR, "$" }, { VC_EXCLAMATION_MARK, "!" }, { VC_OPEN_BRACE, "Left {" },
        { VC_CLOSE_BRACE, "Right }" }, { VC_OPEN_PARENTHESIS, "Left (" },
        { VC_CLOSE_PARENTHESIS, "Right )" }, { VC_COLON, ":" }, { VC_QUOTEDBL, "\"" },
        { VC_LESS, "<" }, { VC_GREATER, ">" }, { VC_NUMBER_SIGN, "#" }, { VC_UNDERSCORE, "_" },

        // Letters
        { VC_A, "A" }, { VC_B, "B" }, { VC_C, "C" }, { VC_D, "D" }, { VC_E, "E" }, { VC_F, "F" },
        { VC_G, "G" }, { VC_H, "H" }, { VC_I, "I" }, { VC_J, "J" }, { VC_K, "K" }, { VC_L, "L" },
        { VC_M, "M" }, { VC_N, "N" }, { VC_O, "O" }, { VC_P, "P" }, { VC_Q, "Q" }, { VC_R, "R" },
        { VC_S, "S" }, { VC_T, "T" }, { VC_U, "U" }, { VC_V, "V" }, { VC_W, "W" }, { VC_X, "X" },
        { VC_Y, "Y" }, { VC_Z, "Z" },

        // Main keyboard special keys
        { VC_ESCAPE, "Esc" }, { VC_BACKSPACE, "Backspace" }, { VC_TAB, "Tab" },
        { VC_CAPS_LOCK, "Caps Lock" }, { VC_ENTER, "Enter" }, { VC_SPACE, "Space" },

        // Navigation cluster
        { VC_PRINT_SCREEN, "Print Screen" }, { VC_SCROLL_LOCK, "Scroll Lock" },
        { VC_PAUSE, "Pause" }, { VC_INSERT, "Insert" }, { VC_DELETE, "Delete" },
        { VC_HOME, "Home" }, { VC_END, "End" }, { VC_PAGE_UP, "Page Up" },
        { VC_PAGE_DOWN, "Page Down" },

        // Arrow keys
        { VC_UP, "Up Arrow" }, { VC_DOWN, "Down Arrow" }, { VC_LEFT, "Left Arrow" },
        { VC_RIGHT, "Right Arrow" },

        // Numpad
        { VC_NUM_LOCK, "Num Lock" }, { VC_KP_DIVIDE, "Num /" }, { VC_KP_MULTIPLY, "Num *" },
        { VC_KP_SUBTRACT, "Num -" }, { VC_KP_ADD, "Num +" }, { VC_KP_ENTER, "Num Enter" },
        { VC_KP_DECIMAL, "Num ." }, { VC_KP_SEPARATOR, "Num ," }, { VC_KP_0, "Num 0" },
        { VC_KP_1, "Num 1" }, { VC_KP_2, "Num 2" }, { VC_KP_3, "Num 3" }, { VC_KP_4, "Num 4" },
        { VC_KP_5, "Num 5" }, { VC_KP_6, "Num 6" }, { VC_KP_7, "Num 7" }, { VC_KP_8, "Num 8" },
        { VC_KP_9, "Num 9" },

        // Extended numpad
        { VC_KP_END, "Num End" }, { VC_KP_DOWN, "Num Down" }, { VC_KP_PAGE_DOWN, "Num Page Down" },
        { VC_KP_LEFT, "Num Left" }, { VC_KP_BEGIN, "Num Begin" }, { VC_KP_RIGHT, "Num Right" },
        { VC_KP_HOME, "Num Home" }, { VC_KP_UP, "Num Up" }, { VC_KP_PAGE_UP, "Num Page Up" },
        { VC_KP_INSERT, "Num Insert" }, { VC_KP_DELETE, "Num Delete" },

        // Media keys
        { VC_MEDIA_PLAY, "Media Play" }, { VC_MEDIA_STOP, "Media Stop" },
        { VC_MEDIA_PREVIOUS, "Media Prev" }, { VC_MEDIA_NEXT, "Media Next" },
        { VC_VOLUME_MUTE, "Mute" }, { VC_VOLUME_DOWN, "Volume Down" },
        { VC_VOLUME_UP, "Volume Up" },

        // Language keys
        { VC_KANA, "Kana" }, { VC_KANJI, "Kanji" }, { VC_HIRAGANA, "Hiragana" },
        { VC_KATAKANA, "Katakana" },

        { VC_UNDEFINED, "?" }
    };

#if defined(_WIN32)
    static inline const std::unordered_map<uint16_t, std::string> windowsKeyMap
        = { { VC_META_L, "Left Windows" }, { VC_META_R, "Right Windows" },
              { VC_SHIFT_L, "Left Shift" }, { VC_SHIFT_R, "Right Shift" },
              { VC_CONTROL_L, "Left CTRL" }, { VC_CONTROL_R, "Right CTRL" },
              { VC_ALT_L, "Left Alt" }, { VC_ALT_R, "Right Alt" }, { VC_CONTEXT_MENU, "Menu" },
              { VC_ALT_GRAPH, "Alt Gr" } };
#elif defined(__APPLE__)
    static inline const std::unordered_map<uint16_t, std::string> macKeyMap
        = { { VC_META_L, "Left CMD" }, { VC_META_R, "Right CMD" }, { VC_SHIFT_L, "Left Shift" },
              { VC_SHIFT_R, "Right Shift" }, { VC_CONTROL_L, "Left CTRL" },
              { VC_CONTROL_R, "Right CTRL" }, { VC_ALT_L, "Left Option" },
              { VC_ALT_R, "Right Option" }, { VC_CONTEXT_MENU, "Menu" } };
#elif defined(__linux__)
    static inline const std::unordered_map<uint16_t, std::string> linuxKeyMap
        = { { VC_META_L, "Left Super" }, { VC_META_R, "Right Super" }, { VC_SHIFT_L, "Left Shift" },
              { VC_SHIFT_R, "Right Shift" }, { VC_CONTROL_L, "Left CTRL" },
              { VC_CONTROL_R, "Right CTRL" }, { VC_ALT_L, "Left Alt" }, { VC_ALT_R, "Right Alt" },
              { VC_CONTEXT_MENU, "Menu" }, { VC_ALT_GRAPH, "Alt Gr" } };
#endif
};

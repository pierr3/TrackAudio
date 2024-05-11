#include "win32_key_util.h"

std::string vector_audio::native::win32::get_key_description(sf::Keyboard::Scancode code)
{
    if (code >= sf::Keyboard::Scancode::F13 && code <= sf::Keyboard::Scancode::F24) {
        int keyNumber = static_cast<int>(code) - static_cast<int>(sf::Keyboard::Scancode::F13) + 13;
        return "F" + std::to_string(keyNumber);
    }

    return sf::Keyboard::getDescription(code).toAnsiString();
}
#pragma once

#include <SFML/System/String.hpp>
#include <SFML/Window/Keyboard.hpp>
#include <string>

namespace vector_audio::native::win32 {
std::string get_key_description(sf::Keyboard::Scancode code);
}
<!-- markdownlint-disable MD033 MD045 MD007 MD028 -->
<h1>
  <img src="https://raw.githubusercontent.com/pierr3/TrackAudio/main/build/icon.png" width="50" valign="middle">
  <span style="font-size: 2em; font-weight: bold">TrackAudio</span>
</h1>

[![Release](https://img.shields.io/github/v/release/pierr3/TrackAudio)](https://github.com/pierr3/TrackAudio/releases)

> **New to TrackAudio?** 📖 Check out the [Key Features](#key-features) and [FAQ](#faq) before getting started!
>
> **Having trouble?** Check the [Troubleshooting](#troubleshooting) section.

🔊 A next generation Audio-For-VATSIM ATC Client for macOS, Linux and Windows.

💡 Get the latest version from our [releases page](https://github.com/pierr3/TrackAudio/releases). Beta builds are available but may be unstable. Found an issue? [Report it](https://github.com/pierr3/TrackAudio/issues/new)!

![screengrab of application](https://raw.githubusercontent.com/pierr3/TrackAudio/main/docs/app_screenshot_feb2025.png)

## Key Features

- 🖥️ Cross-platform support for macOS, Linux, and Windows
- 🎚️ Independent volume and mute controls for each radio
- 🕹️ Dual push-to-talk capability
- 📡 Built-in Unicom & Guard support
- 🎮 Comprehensive Stream Deck integration
- 🪟 Compact mini-mode with transparency options
- 🔌 Developer-friendly SDK with WebSocket and HTTP support
- 🔄 Automatic Updates [Windows]

## Table of Contents

- [FAQ](#faq)
  - [What's the difference between VectorAudio and TrackAudio?](#whats-the-difference-between-vectoraudio-and-trackaudio)
  - [Why does the audio sound different compared to the older AFV for Windows client?](#why-does-the-audio-sound-different-compared-to-the-older-afv-for-windows-client)
  - [I'm having an issue auto-updating on Windows?](#im-having-an-issue-auto-updating-on-windows)
  - [Where are the log and config files stored?](#where-are-the-log-and-config-files-stored)
  - [The station I am trying to add is not found](#the-station-i-am-trying-to-add-is-not-found)
  - [Is there RDF support in EuroScope?](#is-there-rdf-support-in-euroscope)
  - [Is there Stream Deck support?](#is-there-stream-deck-support)
  - [Does TrackAudio support HF Simulation?](#does-trackaudio-support-hf-simulation)
  - [Can I add a frequency manually if it does not exist in the database?](#can-i-add-a-frequency-manually-if-it-does-not-exist-in-the-database)
  - [What is XC and XCA?](#what-is-xc-and-xca)
  - [Can I extend TrackAudio using a plugin/is there an SDK?](#can-i-extend-trackaudio-using-a-pluginis-there-an-sdk)
  - [Ports and endpoints access required for TrackAudio](#ports-and-endpoints-access-required-for-trackaudio)
  - [How to enable verbose logging (advanced)](#how-to-enable-verbose-logging-advanced)
  - [Before opening an issue](#before-opening-an-issue)
- [Troubleshooting](#troubleshooting)
  - [TrackAudio won't start or crashes on launch (Windows)](#trackaudio-wont-start-or-crashes-on-launch-windows)
  - ["Error starting audio devices" or no sound](#error-starting-audio-devices-or-no-sound)
  - [TrackAudio cannot connect or frequently disconnects](#trackaudio-cannot-connect-or-frequently-disconnects)
  - [My microphone is too quiet](#my-microphone-is-too-quiet)
  - [Push-to-Talk (PTT) not working](#push-to-talk-ptt-not-working)
  - [TrackAudio does not work on Linux with Wayland](#trackaudio-does-not-work-on-linux-with-wayland)
- [Known Issues and Limitations](#known-issues-and-limitations)
- [Installation](#installation)
- [Build](#build)
- [Contributing](#contributing)

## FAQ

### What's the difference between VectorAudio and TrackAudio?

TrackAudio is simply the next iteration of VectorAudio, using a different set of technology. VectorAudio is no longer maintained and supported, so you should switch to TrackAudio as soon as possible.

### Why does the audio sound different compared to the older AFV for Windows client?

TrackAudio offers multiple types of radio hardware, Schmid ED-137B is set by default and can changed in settings, these dictate how the received audio from the network is processed.

- Schmid ED-137B – Perceived as clearer audio with slight distortion, emphasising lower frequencies
- Rockwell Collins 2100 – Typical radio-like distortion, commonly used in Boeing and Airbus aircraft (resembles the "Realistic ATC Audio Effect" in the older AFV for Windows client)
- Garrex 220 – Similar to the Schmid ED-137B, but with slightly less distortion and a greater emphasis on higher frequencies.

### I'm having an issue auto-updating on Windows?

If the auto-updater is not working, download and install the latest version manually from the [releases page](https://github.com/pierr3/TrackAudio/releases). If the issue persists after a manual update, try deleting the config folder at `%LocalAppData%\trackaudio` and reinstalling. If you are still having trouble, please [open an issue](https://github.com/pierr3/TrackAudio/issues/new) with a copy of your log file.

### Where are the log and config files stored?

On macOS: `~/Library/Application\ Support/trackaudio`
On Linux: `~/.local/state/trackaudio`
On Windows: `%LocalAppData%\trackaudio`

### The station I am trying to add is not found

Ask your FE to define the station in the AFV database. Per the AFV FE manual, all stations should be defined in the database. TrackAudio does support ad-hoc station creation if you log-in as a DEL, GND or TWR that has no station definition. It will then place a transceiver at your center of visibility set in your controller client.

### Is there RDF support in EuroScope?

Yes! @KingfuChan has updated the RDF plugin for EuroScope to include support for TrackAudio. Find the plugin [in this repo](https://github.com/KingfuChan/RDF/).

### Is there Stream Deck support?

Yes! @neilenns has created a dedicated TrackAudio Stream Deck plugin (which includes volume dial support). Find the plugin [in this repo](https://github.com/neilenns/streamdeck-trackaudio) or [in the Stream Deck marketplace](https://marketplace.elgato.com/product/trackaudio-e913a0ca-4c12-411d-a5a6-acf5f6c4bdea).

### Does TrackAudio support HF Simulation?

Yes, but only if you add a frequency by callsign (must be defined in database). HF Squelch is enabled by default

### Can I add a frequency manually if it does not exist in the database?

Yes, using the menu on the right, however, this will only create one transceiver (antenna) at your center of visibility set in your atc client. This means that you will not get the same radio coverage as stations defined in database.

### What is XC and XCA?

When you right click XCA on a frequency that you are listening to, and if you are logged in as ATC, all the transceivers of that frequency will be cross-coupled. This means that all transmissions received by a transceiver in that list will also be re-emitted by all other transceivers. This allows for pilots in different parts of your airspace to hear eachother, since they may be using a different transceiver.

When you left click XCA, you activate "cross-couple across". This is the same as clicking "XC" in AFV for Windows, and allows you to cross-couple across frequencies, meaning you can join multiple sets of transceivers regardless of frequency.
Pay attention, however, as you may cause overlap of radio by enabling this. For example, if you XCA one frequency that has a transceiver near the border of a neighboring vAcc with another that is at the other end of your sector, far away from that border with your neighboring vAcc, you will suddenly extend coverage of that second frequency to the border with your neighboor.
This feature is mostly useful for CTR positions, when regrouping large sectors together. In general, you should be using XCA every time you control.

### Can I extend TrackAudio using a plugin/is there an SDK?

Yes! Have a look [in the wiki](https://github.com/pierr3/TrackAudio/wiki/SDK-documentation). TrackAudio offers a WebSocket and HTTP SDK. If you need additional features, please open an issue with a detailed request, I'll be happy to look at it with no guarantees.

### Ports and endpoints access required for TrackAudio

To function, TrackAudio requires that:

- An HTTPS (port 443) connection to the endpoint raw.githubusercontent.com be possible
- An HTTPS (port 443) connection to the endpoint voice1.vatsim.net be possible
- An HTTPS (port 443) connection to the endpoint slurper.vatsim.net be possible
- A UDP bidirectional connection be possible towards vatsim servers

Verify that your anti-virus, firewall or other network controller allows access to those endpoints.

For the SDK to function

- Local TCP port 49080 be open for both HTTP and WebSocket

Your system date and time must also be synced properly to reflect the actual current time (irrespective of timezones).

### How to enable verbose logging (advanced)

On request, you can enable verbose logging of the backend which may provide some useful debug information. To do so, create an empty file called verbose.enable in the folder where the config and log file is stored.

### Before opening an issue

Before creating a new GitHub issue, please:

1. Make sure you are running the [latest version](https://github.com/pierr3/TrackAudio/releases) of TrackAudio
2. Check the [Troubleshooting](#troubleshooting) section below
3. Search [existing issues](https://github.com/pierr3/TrackAudio/issues) to see if your problem has already been reported

If you still need help, [open an issue](https://github.com/pierr3/TrackAudio/issues/new) and **always include**:

- Your operating system and version (e.g. Windows 11, macOS 15.2, Ubuntu 24.04)
- Your TrackAudio version
- A copy of your log file (see [Where are the log and config files stored?](#where-are-the-log-and-config-files-stored))
- Clear steps to reproduce the problem

## Troubleshooting

### TrackAudio won't start or crashes on launch (Windows)

1. Make sure you have installed the [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) — TrackAudio will not start without it
2. Delete the config folder at `%LocalAppData%\trackaudio` and reinstall TrackAudio
3. Check that your antivirus or firewall is not blocking TrackAudio
4. Try the [latest release or beta](https://github.com/pierr3/TrackAudio/releases) — older versions may have Windows-specific bugs that have since been fixed

### "Error starting audio devices" or no sound

1. Open TrackAudio Settings and make sure **both** your input (microphone) **and** output (speaker/headset) devices are selected. TrackAudio requires both to be set and will not work otherwise
2. If your audio device does not appear in the list, check that it is not disabled in your operating system's sound settings
3. On Windows, make sure no other application has exclusive access to your audio device

### TrackAudio cannot connect or frequently disconnects

1. Make sure your system clock is accurate — TrackAudio requires your date and time to be synced correctly (regardless of timezone)
2. Check that your firewall or antivirus is not blocking the required connections (see [Ports and endpoints](#ports-and-endpoints-access-required-for-trackaudio))
3. If you experience frequent disconnects, try using a wired internet connection. TrackAudio requires stable UDP connectivity to VATSIM servers, and unstable Wi-Fi or mobile connections can cause drops

### My microphone is too quiet

TrackAudio does not have a built-in microphone gain control — it uses your system's microphone volume.

1. **Windows**: Go to Settings > System > Sound > Input, select your microphone, and increase the volume. If your device supports it, look for a "Microphone Boost" option in the advanced sound settings
2. **macOS**: Go to System Settings > Sound > Input and adjust the input volume slider
3. **Linux**: Use your distribution's sound settings or a tool like `pavucontrol` to adjust the microphone input level
4. Some USB headsets and microphones have their own gain controls — check the manufacturer's software or hardware controls

### Push-to-Talk (PTT) not working

**On macOS — PTT does not work when TrackAudio is not focused:**
macOS requires Input Monitoring permissions for background keyboard input. Go to Settings > Privacy & Security > Input Monitoring and add TrackAudio to the list. If TrackAudio is already listed, remove it and add it again — this permission can reset after app updates. Note: this is only needed for keyboard PTT. Joystick PTT does not require this permission.

**PTT only works when TrackAudio window is focused:**
On macOS, this is the Input Monitoring permissions issue described above. On other platforms, try binding a different key.

**Joystick automatically assigns itself when setting PTT:**
Some joysticks continuously send a key-down signal, which gets picked up when you try to set a new PTT. To work around this, **right-click** (instead of left-click) the "Set new PTT" button in settings. This temporarily blocks joystick inputs so you can set a keyboard key instead.

**PTT key shows as "Unknown (XXX)":**
This means TrackAudio could not determine the name of the key you bound. The key will still work as a normal push-to-talk. If you would like the key name to be added, please open a [GitHub issue](https://github.com/pierr3/TrackAudio/issues/new) with your operating system, log file, and the actual name of the key you intended to bind.

**PTT gets stuck while transmitting:**
This can happen if you switch windows or alt-tab while holding the PTT key. Release the key and press it again to reset.

### TrackAudio does not work on Linux with Wayland

TrackAudio does **not** support Wayland due to limitations in upstream libraries used for input handling. You must run TrackAudio under an X11/Xorg session. On most Linux distributions, you can select X11 as the session type on the login screen before signing in.

## Known Issues and Limitations

- **Wayland is not supported on Linux** — you must use an X11/Xorg session (see [Troubleshooting](#trackaudio-does-not-work-on-linux-with-wayland) above)
- **HF Simulation** requires the frequency to be added by callsign, and the station must exist in the AFV database
- **Manually added (ad-hoc) frequencies** only create a single transceiver at your center of visibility, which gives limited radio coverage compared to stations defined in the AFV database
- **Always-on-top in mini mode** may not work reliably on some Linux window managers

## Installation

### Linux

#### Archlinux

TrackAudio is available in the [AUR](https://aur.archlinux.org/packages/trackaudio-bin) and can be installed using your favourite AUR helper, for example:

- `yay -S trackaudio-bin`
- `paru -S trackaudio-bin`

#### Debian

TrackAudio is packaged as a `.deb` and should run without any specific actions.

Download the latest release on the [release page](https://github.com/pierr3/TrackAudio/releases) and run the .deb
If it does not open, you might want to make sure it has permission to run as an executable by running `chmod +x` on the .deb File.

Note: this will install libafv_native.so in /usr/lib, a required library for TrackAudio to run.

### macOS

Download the latest release on the [release page](https://github.com/pierr3/TrackAudio/releases) and install the .app into your applications folder.

TrackAudio is available in two versions, one for Apple Silicon (arm64) and one for Intel Macs (x64).

Alternatively, TrackAudio can be installed using [Homebrew](https://brew.sh/index). Run the following commands to first install the Homebrew Tap and then the Homebrew Cask. This way the app gets upgraded when you run `brew upgrade`.

```sh
# Add the tap
brew tap flymia/homebrew-trackaudio

# Install the cask
brew install --cask trackaudio
```

Depending on your system, the cask will install the ARM version or the x86_64 version.

### Windows

**Important:** You must first download and install the [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe). TrackAudio will not start without it.

Then download the latest release from the [releases page](https://github.com/pierr3/TrackAudio/releases) and run the installer.

## Build

TrackAudio depends on afv-native and SFML (for input handling).

`cmake` is required to build the project. Dependencies will be downloaded through vcpkg at build time. See vcpkg.json for further details.

On Linux, the following packages are required: `build-essentials libx11-dev libxrandr-dev libxcursor-dev libxi-dev libudev-dev libgl1-mesa-dev pkg-config`, you may also need further packages to enable the different audio backends, such as Alsa, JACK or PulseAudio.

On macOS, XCode Command Line tools, CMake and Homebrew are required and the following homebrew package is required: `pkg-config`

On Windows, Visual Studio is required (Community Edition is fine) with the `Desktop development with C++` component installed.

## Build process

If `cmake-js` isn't already installed run `pnpm add -g cmake-js`. For the first build run the following:

```sh
git submodule update --init --recursive backend/vcpkg
git submodule update --init --recursive backend/extern/afv-native
git submodule update --init --recursive backend/extern/libuiohook
pnpm run build:backend
pnpm install
pnpm run dev
```

Subsequent builds only require the `pnpm run dev` command if you only wish to modify the frontend. Building the C++ backend will require running `pnpm run build:backend`.

## Packaging

TrackAudio will be automatically packaged as a .dmg on macOs, .deb on Linux and .exe installer on windows. To package run the
appropriate command for the desired platform.

| Platform | Command                |
| -------- | ---------------------- |
| Linux    | `pnpm run build:linux` |
| Mac      | `pnpm run build:mac`   |
| Windows  | `pnpm run build:win`   |

## Contributing

If you want to help with the project, you are always welcome to open a PR. 🙂

# TrackAudio

A next generation Audio-For-VATSIM ATC Client for macOS, Linux and Windows.

![screengrab of application](https://raw.githubusercontent.com/pierr3/TrackAudio/main/docs/app_screenshot_apr2024.png)

## Note

This software is in beta, and is missing features or may be broken in some places. Report any issues on GitHub. It is, however, ready for use on the network and you should not encounter major issues.

## Releases

See [releases](https://github.com/pierr3/TrackAudio/releases) for latest builds

## FAQ

### What's the difference between VectorAudio and TrackAudio?

TrackAudio is simply the next iteration of VectorAudio, using a different set of technology. While TrackAudio is still in beta, you should try to use it instead of VectorAudio, as the latter will no longer be supported at some point.

### My PTT does not work on macOS

macOS has strict permissioning around background keyboard inputs. TrackAudio should prompt you on first launch to request input monitoring permissions. Sometimes, upon updating the app, this setting will undo itself. In that case, please go to your Settings -> Privacy & Security -> Input Monitoring and add TrackAudio in the list (remove it if it was already there). This is required purely because otherwise, your Push to Talk would not work when the window is not in focus (if you use a keyboard push to talk, a Joystick push to talk does not require this permission)

### Where are the log files stored?

On macOS: `~/Library/Application\ Support/trackaudio`
On Linux: `~/.local/state/trackaudio`
On Windows: `%LocalAppData%\trackaudio`

### The station I am trying to add is not found

Ask your FE to define the station in the AFV database. Per the AFV FE manual, all stations should be defined in the database. TrackAudio does support ad-hoc station creation if you log-in as a DEL, GND or TWR that has no station definition. It will then place a transceiver at your center of visibility set in your controller client.

### Is there RDF support in EuroScope?

Yes! @KingfuChan has updated the RDF plugin for EuroScope to include support for TrackAudio. Find the plugin [in this repo](https://github.com/KingfuChan/RDF/).

### Does TrackAudio support HF Simulation?

Yes, but only if you add a frequency by callsign (must be defined in database). HF Squelch is enabled by default

### Can I add a frequency manually if it does not exist in the database?

Yes, using the menu on the right, however, this will only create one transceiver (antenna) at your center of visibility set in your atc client. This means that you will not get the same radio coverage as stations defined in database.

### What's this telemetry popup about?

TrackAudio utilizes remote telemetry in the event of a bug, sending an error report to a tool called Sentry. Only essential information from the crash report is sent, and no data leaves your device unless an error occurs. We do not record your IP address or VATSIM password. Your data would be sent to a third-party service, Sentry, to their servers located in Germany.

This is entirely optional, but greatly assists in tracking down errors.

If you opt-in, you can opt-out at any time in the settings. You will need to restart TrackAudio for this to fully take effect.

### What is XC and XCA?

When you right click XCA on a frequency that you are listening to, and if you are logged in as ATC, all the transceivers of that frequency will be cross-coupled. This means that all transmissions received by a transceiver in that list will also be re-emitted by all other transceivers. This allows for pilots in different parts of your airspace to hear eachother, since they may be using a different transceiver. In general, you should be using XC every time you control.

When you left click XCA, you activate "cross-couple across". This is the same as clicking "XC" in AFV for Windows, and allows you to cross-couple across frequencies, meaning you can join multiple sets of transceivers regardless of frequency.
Pay attention, however, as you may cause overlap of radio by enabling this. For example, if you XCA one frequency that has a transceiver near the border of a neighboring vAcc with another that is at the other end of your sector, far away from that border with your neighboring vAcc, you will suddenly extend coverage of that second frequency to the border with your neighboor.
This feature is mostly useful for CTR positions, when regrouping large sectors together.

### Can I extend TrackAudio using a plugin/is there an SDK?

Yes! Have a look [in the wiki](https://github.com/pierr3/TrackAudio/wiki/SDK-documentation). TrackAudio offers a WebSocket and HTTP SDK. If you need additional features, please open an issue with a detailed request, I'll be happy to look at it with no guarantees.

### I have an issue with TrackAudio

Read this document entirely first. If you can't find the answer to your problem, please [open an issue](https://github.com/pierr3/TrackAudio/issues/new) on GitHub, attaching relevant lines from the afv.log file that should be in the same folder as the executable.

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

Download the latest release on the [release page](https://github.com/pierr3/TrackAudio/releases) and run the executable. This should install TrackAudio.

## Build

### Dependencies

TrackAudio depends on afv-native and SFML (for input handling).

`cmake` is required to build the project. Dependencies will be downloaded through vcpkg at build time. See vcpkg.json for further details.

On Linux, the following packages are required: `build-essentials libx11-dev libxrandr-dev libxcursor-dev libxi-dev libudev-dev libgl1-mesa-dev pkg-config`, you may also need further packages to enable the different audio backends, such as Alsa, JACK or PulseAudio.

On macOS, XCode Command Line tools, CMake and Homebrew are required and the following homebrew package is required: `pkg-config`

On Windows, Visual Studio is required (Community Edition is fine) with the `Desktop development with C++` component installed.

## Build process

If `cmake-js` isn't already installed run `npm install -g cmake-js`. For the first build run the following:

```sh
git submodule update --init --remote backend/vcpkg
git submodule update --init --remote backend/extern/afv-native
npm run build:backend
npm install
npm run dev
```

Subsequent builds only require the `npm run dev` command if you only wish to modify the frontend. Building the C++ backend will require running `npm run build:backend`.

## Packaging

TrackAudio will be automatically packaged as a .dmg on macOs, .deb on Linux and .exe installer on windows. To package run the
appropriate command for the desired platform.

| Platform | Command |
| - | - |
| Linux | `npm run build:linux` |
| Mac | `npm run build:mac` |
| Windows | `npm run build:win` |

## Contributing

If you want to help with the project, you are always welcome to open a PR. 🙂

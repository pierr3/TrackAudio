#include <windows.h>
#include <string>
#include <filesystem>
#include <memory>
#include <shlobj.h>
#include <vector>

namespace fs = std::filesystem;

// Registry functions
std::wstring GetRegistryString(HKEY root, const std::wstring &subKey, const std::wstring &value)
{
  HKEY hKey;
  std::wstring result;

  if (RegOpenKeyExW(root, subKey.c_str(), 0, KEY_READ, &hKey) == ERROR_SUCCESS)
  {
    DWORD type = REG_SZ;
    DWORD dataSize = 0;

    if (RegQueryValueExW(hKey, value.c_str(), nullptr, &type, nullptr, &dataSize) == ERROR_SUCCESS)
    {
      std::vector<wchar_t> buffer(dataSize / sizeof(wchar_t) + 1);

      if (RegQueryValueExW(hKey, value.c_str(), nullptr, &type,
                           reinterpret_cast<LPBYTE>(buffer.data()),
                           &dataSize) == ERROR_SUCCESS)
      {
        result = buffer.data();
      }
    }

    RegCloseKey(hKey);
  }

  return result;
}

// Path validation
bool FileExists(const std::wstring &path)
{
  if (path.empty())
    return false;
  try
  {
    return fs::exists(path) && fs::is_regular_file(path);
  }
  catch (...)
  {
    return false;
  }
}

// Get EuroScope executable path
std::wstring GetEuroscopePath()
{
  const std::vector<std::wstring> registryPaths = {
      L"Software\\VATSIM\\TrackAudio",
      L"Software\\VATSIM\\EuroScope"};

  // First try registry paths (both HKLM and HKCU)
  for (const auto &regPath : registryPaths)
  {
    std::wstring path = GetRegistryString(HKEY_LOCAL_MACHINE, regPath, L"InstallPath");
    if (path.empty())
    {
      path = GetRegistryString(HKEY_CURRENT_USER, regPath, L"InstallPath");
    }

    if (!path.empty())
    {
      // If path is a directory, append EuroScope.exe
      if (fs::is_directory(path))
      {
        path = (fs::path(path) / L"EuroScope.exe").wstring();
      }
      if (FileExists(path))
        return path;
    }
  }

  // Try common installation locations
  const std::vector<std::wstring> commonPaths = {
      L"C:\\Program Files (x86)\\EuroScope\\EuroScope.exe",
      L"C:\\Program Files\\EuroScope\\EuroScope.exe"};

  for (const auto &path : commonPaths)
  {
    if (FileExists(path))
      return path;
  }

  return L"";
}

// Get TrackAudio executable path
std::wstring GetTrackAudioPath()
{
  try
  {
    // First try to get our own path
    wchar_t exePath[MAX_PATH];
    if (GetModuleFileNameW(NULL, exePath, MAX_PATH))
    {
      fs::path launcherPath(exePath);
      auto trackAudioPath = launcherPath.parent_path() / L"trackaudio.exe";
      if (FileExists(trackAudioPath.wstring()))
      {
        return trackAudioPath.wstring();
      }
    }

    // If that fails, try registry
    std::wstring regPath = GetRegistryString(
        HKEY_LOCAL_MACHINE,
        L"Software\\VATSIM\\TrackAudio",
        L"InstallPath");

    if (regPath.empty())
    {
      regPath = GetRegistryString(
          HKEY_CURRENT_USER,
          L"Software\\VATSIM\\TrackAudio",
          L"InstallPath");
    }

    if (!regPath.empty())
    {
      auto path = fs::path(regPath) / L"trackaudio.exe";
      if (FileExists(path.wstring()))
      {
        return path.wstring();
      }
    }
  }
  catch (...)
  {
    // Handle any filesystem errors silently and return empty path
  }

  return L"";
}

// Launch a process
bool LaunchProcess(const std::wstring &path, const std::wstring &args = L"")
{
  STARTUPINFOW si = {sizeof(si)};
  PROCESS_INFORMATION pi;

  std::wstring cmdLine = L"\"" + path + L"\"";
  if (!args.empty())
  {
    cmdLine += L" " + args;
  }

  auto cmdLineStr = std::make_unique<wchar_t[]>(cmdLine.length() + 1);
  wcscpy_s(cmdLineStr.get(), cmdLine.length() + 1, cmdLine.c_str());

  bool success = CreateProcessW(
      nullptr,          // No module name (use command line)
      cmdLineStr.get(), // Command line
      nullptr,          // Process handle not inheritable
      nullptr,          // Thread handle not inheritable
      FALSE,            // Set handle inheritance to FALSE
      0,                // No creation flags
      nullptr,          // Use parent's environment block
      nullptr,          // Use parent's starting directory
      &si,              // Pointer to STARTUPINFO structure
      &pi               // Pointer to PROCESS_INFORMATION structure
  );

  if (success)
  {
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
  }

  return success;
}

// Main entry point
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
  try
  {
    // Find EuroScope
    std::wstring euroscopePath = GetEuroscopePath();
    if (euroscopePath.empty())
    {
      MessageBoxW(nullptr,
                  L"EuroScope was not found. Please make sure EuroScope is installed.",
                  L"EuroScope Not Found", MB_OK | MB_ICONWARNING);
      return 1;
    }

    // Find TrackAudio
    std::wstring trackAudioPath = GetTrackAudioPath();
    if (trackAudioPath.empty())
    {
      MessageBoxW(nullptr,
                  L"TrackAudio was not found. Please repair your TrackAudio installation.",
                  L"TrackAudio Not Found", MB_OK | MB_ICONERROR);
      return 1;
    }

    // Launch EuroScope
    if (!LaunchProcess(euroscopePath))
    {
      MessageBoxW(nullptr,
                  L"Failed to start EuroScope. Please make sure you have permission to run it.",
                  L"Launch Error", MB_OK | MB_ICONERROR);
      return 1;
    }

    // Wait a bit for EuroScope to initialize
    Sleep(1500);

    // Launch TrackAudio with auto-connect
    if (!LaunchProcess(trackAudioPath, L"--auto-connect"))
    {
      MessageBoxW(nullptr,
                  L"Failed to start TrackAudio. Please make sure you have permission to run it.",
                  L"Launch Error", MB_OK | MB_ICONERROR);
      return 1;
    }

    return 0;
  }
  catch (const std::exception &e)
  {
    MessageBoxA(nullptr, e.what(), "Unexpected Error", MB_OK | MB_ICONERROR);
    return 1;
  }
  catch (...)
  {
    MessageBoxW(nullptr, L"An unexpected error occurred.", L"Error", MB_OK | MB_ICONERROR);
    return 1;
  }
}

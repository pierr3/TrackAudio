@echo off
setlocal enabledelayedexpansion

:: Try to find Visual Studio installation using vswhere
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo Error: Visual Studio installer not found
    exit /b 1
)

:: Get latest VS installation path
for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
    set "VS_PATH=%%i"
)

if not defined VS_PATH (
    echo Error: Visual Studio installation not found
    exit /b 1
)

:: Set up Visual Studio environment
set "VCVARS_PATH=%VS_PATH%\VC\Auxiliary\Build\vcvars64.bat"
if not exist "!VCVARS_PATH!" (
    echo Error: vcvars64.bat not found at !VCVARS_PATH!
    exit /b 1
)

:: Call vcvars64 and capture any errors
call "!VCVARS_PATH!" || (
    echo Error: Failed to initialize Visual Studio environment
    exit /b 1
)

:: Extract script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Set paths
for %%i in ("%SCRIPT_DIR%\..") do set "TA_PATH=%%~fi"

:: Check for --debug argument
set "DEBUG_FLAG="
if "%1"=="--debug" set "DEBUG_FLAG=--debug"

:: Execute build command
call node "%SCRIPT_DIR%\build-napi.js" %DEBUG_FLAG%

endlocal
exit /b %ERRORLEVEL%

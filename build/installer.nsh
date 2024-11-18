
!include LogicLib.nsh
!include FileFunc.nsh
!include nsDialogs.nsh
!include MUI2.nsh

# Variables
Var Dialog
Var PathTextBox
Var euroscopePath
Var euroscopeFound
Var euroscopeDir

# Custom page
Page custom EuroScopePage EuroScopePageLeave

!macro customInit
  File /oname=$PLUGINSDIR\vc_redist.x64.exe "${BUILD_RESOURCES_DIR}\vc_redist.x64.exe"
  ExecWait '"$PLUGINSDIR\vc_redist.x64.exe" /install /norestart /passive'


  # Reset variables
  StrCpy $euroscopePath ""
  StrCpy $euroscopeFound "false"
  StrCpy $euroscopeDir ""

  # Check common installation paths for EuroScope
  ${If} ${FileExists} "$PROGRAMFILES32\EuroScope\EuroScope.exe"
      StrCpy $euroscopePath "$PROGRAMFILES32\EuroScope\EuroScope.exe"
      StrCpy $euroscopeFound "true"
      StrCpy $euroscopeDir "$PROGRAMFILES32\EuroScope"
  ${ElseIf} ${FileExists} "$PROGRAMFILES64\EuroScope\EuroScope.exe"
      StrCpy $euroscopePath "$PROGRAMFILES64\EuroScope\EuroScope.exe"
      StrCpy $euroscopeFound "true"
      StrCpy $euroscopeDir "$PROGRAMFILES64\EuroScope"
    ${EndIf}
!macroend

Function EuroScopePage
    # Set the header text for this page
    !insertmacro MUI_HEADER_TEXT "EuroScope Integration" "Configure optional EuroScope integration"

    nsDialogs::Create 1018
    Pop $Dialog

    ${If} $Dialog == error
        Abort
    ${EndIf}

    ${If} $euroscopeFound == "true"
        ${NSD_CreateLabel} 0 0 100% 30u "EuroScope was detected automatically. You can modify the path below if needed, or click Next to continue with EuroScope integration."
    ${Else}
        ${NSD_CreateLabel} 0 0 100% 30u "EuroScope was not detected automatically. If you have EuroScope installed and would like to integrate TrackAudio with it, please select your EuroScope.exe location below. This step is optional - you can click Next to skip EuroScope integration."
    ${EndIf}
    Pop $0

    ${NSD_CreateFileRequest} 0 35u 75% 12u $euroscopePath
    Pop $PathTextBox

    ${NSD_CreateButton} 76% 35u 20% 12u "Browse..."
    Pop $0
    ${NSD_OnClick} $0 OnBrowse

    nsDialogs::Show
FunctionEnd

Function OnBrowse
    nsDialogs::SelectFileDialog open "" "EuroScope.exe|EuroScope.exe"
    Pop $0
    ${If} $0 != ""
        ${NSD_SetText} $PathTextBox $0
    ${EndIf}
FunctionEnd

Function EuroScopePageLeave
    ${NSD_GetText} $PathTextBox $euroscopePath
    ${If} $euroscopePath != ""
        StrCpy $euroscopeFound "true"
        ${GetParent} $euroscopePath $euroscopeDir
    ${Else}
        StrCpy $euroscopeFound "false"
    ${EndIf}
FunctionEnd

!macro customInstall
  CreateShortCut "$SMPROGRAMS\TrackAudio (Auto Connect).lnk" "$INSTDIR\TrackAudio.exe" "--auto-connect"

    ${If} $euroscopeFound == "true"
        ${If} ${FileExists} "$INSTDIR\EuroScopeWithTrackAudio.exe"
            CreateShortcut "$SMPROGRAMS\TrackAudio\EuroScope with TrackAudio.lnk" \
                "$INSTDIR\EuroScopeWithTrackAudio.exe" \
                '"$euroscopePath"'
            CreateShortcut "$DESKTOP\EuroScope with TrackAudio.lnk" \
                "$INSTDIR\EuroScopeWithTrackAudio.exe" \
                '"$euroscopePath"'
        ${EndIf}
    ${EndIf}
!macroend

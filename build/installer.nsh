!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER
  Function checkVCRedist
    ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  FunctionEnd
!endif

!macro customInit
  Delete "$INSTDIR\Uninstall*.exe"

  Push $0
  Call checkVCRedist
  ${If} $0 != "1"
    inetc::get /CAPTION " " /BANNER "Downloading Microsoft Visual C++ Redistributable..." "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vc_redist.x64.exe"
    ExecWait "$TEMP\vc_redist.x64.exe /install /norestart /passive"
    ;IfErrors InstallError ContinueInstall ; vc_redist exit code is unreliable :(
    Call checkVCRedist
    ${If} $0 == "1"
      Goto ContinueInstall
    ${EndIf}

    ;InstallError:
      MessageBox MB_ICONSTOP "\
        There was an unexpected error installing$\r$\n\
        Microsoft Visual C++ Redistributable.$\r$\n\
        The installation of ${PRODUCT_NAME} cannot continue."
  ${EndIf}
  ContinueInstall:
    Pop $0
!macroend

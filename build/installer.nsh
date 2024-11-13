!macro customInstall
  File /oname=$PLUGINSDIR\vc_redist.x64.exe "${BUILD_RESOURCES_DIR}\vc_redist.x64.exe"
  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  IfErrors notInstalled
  StrCmp $0 "1" installed notInstalled

  notInstalled:
  ExecWait '"$PLUGINSDIR\vc_redist.x64.exe" /norestart'
  installed:
!macroend
!macroend

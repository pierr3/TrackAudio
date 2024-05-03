#!/usr/bin/env bash

arch=$1

cp -R ./scripts/AppImage/TrackAudio.AppDir/ ./build/
cp ./resources/*.wav ./build/TrackAudio.AppDir/usr/share/trackaudio/
cp ./LICENSE ./build/TrackAudio.AppDir/usr/share/trackaudio/
cp ./resources/AppIcon/AppIcon.png ./build/TrackAudio.AppDir/trackaudio.png
cp ./resources/AppIcon/AppIcon.png ./build/TrackAudio.AppDir/.DirIcon
cp ./resources/AppIcon/AppIcon.png ./build/TrackAudio.AppDir/usr/share/trackaudio/

cp ./backend/build/Release/libafv_native.so ./build/TrackAudio.AppDir/usr/lib/
chmod +x ./build/TrackAudio.AppDir/usr/lib/libafv_native.so

cp -R ./out/TrackAudio-linux-$arch/** ./build/TrackAudio.AppDir/usr/share/trackaudio/
chmod +x ./build/TrackAudio.AppDir/usr/share/trackaudio/trackaudio
chmod 755 ./build/TrackAudio.AppDir/usr/share/trackaudio/trackaudio
ln -s ./build/TrackAudio.AppDir/usr/share/trackaudio/trackaudio ./build/TrackAudio.AppDir/usr/bin/trackaudio 
chmod +x ./build/TrackAudio.AppDir/usr/bin/trackaudio

chmod +x ./build/TrackAudio.AppDir/trackaudio.desktop

if [ "$arch" = "arm64" ]; then
    mv ./build/TrackAudio.AppDir/AppRun-aarch64 ./build/TrackAudio.AppDir/AppRun
    rm ./build/TrackAudio.AppDir/AppRun-x86_64
else
    mv ./build/TrackAudio.AppDir/AppRun-x86_64 ./build/TrackAudio.AppDir/AppRun
    rm ./build/TrackAudio.AppDir/AppRun-aarch64
fi

chmod +x ./build/TrackAudio.AppDir/AppRun

wget -O appimagetool-x86_64.AppImage https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage

./appimagetool-x86_64.AppImage ./build/TrackAudio.AppDir -u "gh-releases-zsync|pierr3|TrackAudio|latest|TrackAudio-*$arch.AppImage.zsync"
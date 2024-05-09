import type { ForgeConfig } from "@electron-forge/shared-types";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import path from "path";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";
import fs from "fs";
import { spawn } from "child_process";

const config: ForgeConfig = {
  packagerConfig: {
    name: "TrackAudio",
    asar: true,
    osxSign: {},
    icon: "resources/AppIcon/AppIcon",
    extraResource: [
      "resources/AC_Bus_f32.wav",
      "resources/Click_f32.wav",
      "resources/Crackle_f32.wav",
      "resources/HF_WhiteNoise_f32.wav",
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@psiservices-ccounterman/electron-forge-maker-nsis",
      config: {
        installerIcon: "resources/AppIcon/AppIcon.ico",
        uninstallerIcon: "resources/AppIcon/AppIcon.ico",
        icon: "resources/AppIcon/AppIcon.ico",
        license: "LICENSE",
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "resources/AppIcon/AppIcon.icns",
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        productName: "TrackAudio",
        icon: "resources/AppIcon/AppIcon.tiff",
        categories: ["Game"],
        homepage: "https://github.com/pierr3/TrackAudio/",
        scripts: {
          postinst: "scripts/install_library_deb.sh",
        },
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/index.html",
            js: "./src/renderer.ts",
            name: "main_window",
            preload: {
              js: "./src/preload.ts",
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    postPackage: async (config, packageResult) => {
      if (process.platform === "linux") {
        fs.rename(
          path.join(packageResult.outputPaths[0], "TrackAudio"),
          path.join(packageResult.outputPaths[0], "trackaudio"),
          function (err) {
            if (err) throw err;
          }
        );
      }
    },
    packageAfterExtract: async (forgeConfig, buildPath) => {
      try {
        if (process.platform === "darwin") {
          const trackAudioAfvPath = path.join(
            process.cwd(),
            "backend",
            "build",
            "Release",
            "libafv_native.dylib"
          );

          fs.copyFileSync(
            trackAudioAfvPath,
            path.join(
              buildPath,
              "Electron.app",
              "Contents",
              "Frameworks",
              "libafv_native.dylib"
            )
          );
          console.log("file found at", trackAudioAfvPath);
          console.log(
            "Copied libafv_native.dylib to",
            path.join(
              buildPath,
              "Electron.app",
              "Contents",
              "Frameworks",
              "libafv_native.dylib"
            )
          );
        }
      } catch (error) {
        console.error("An error occurred while copying the file:", error);
      }

      try {
        if (process.platform === "linux") {
          const trackAudioAfvPath = path.join(
            process.cwd(),
            "backend",
            "build",
            "Release",
            "libafv_native.so"
          );

          fs.copyFileSync(
            trackAudioAfvPath,
            path.join(buildPath, "libafv_native.so")
          );
          console.log("file found at", trackAudioAfvPath);
          console.log(
            "Copied libafv_native.so to",
            path.join(buildPath, "libafv_native.so")
          );
        }
      } catch (error) {
        console.error("An error occurred while copying the file:", error);
      }

      try {
        if (process.platform === "win32") {
          const sourceDir = path.join(__dirname, "backend", "build", "Release");
          const targetDir = buildPath;

          try {
            const files = fs.readdirSync(sourceDir);
            files.forEach((file) => {
              if (path.extname(file) === ".dll") {
                const sourceFile = path.join(sourceDir, file);
                const targetFile = path.join(targetDir, file);

                try {
                  fs.copyFileSync(sourceFile, targetFile);
                  console.log(`Copied ${file} to ${targetDir}`);
                } catch (err) {
                  console.error(
                    `An error occurred while copying the file ${file}:`,
                    err
                  );
                }
              }
            });
            // Continue with your logic here using the files array
          } catch (err) {
            console.error(
              "An error occurred while reading the directory:",
              err
            );
          }
        }
      } catch (error) {
        console.error("An error occurred while copying the file:", error);
      }
    },
  },
};

export default config;

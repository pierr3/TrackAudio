import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
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
    asar: true,
    osxSign: {},
    icon: "resources/AppIcon",
    name: "TrackAudio",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
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
    packageAfterExtract: async (forgeConfig, buildPath) => {
      console.info("Packages built at:", buildPath);

      console.log("Subdirectories of buildPath:");
      const subdirectories = fs.readdirSync(buildPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      subdirectories.forEach((subdirectory) => {
        console.log(subdirectory);
        const subdirectoryPath = path.join(buildPath, subdirectory);
        const subSubdirectories = fs.readdirSync(subdirectoryPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        subSubdirectories.forEach((subSubdirectory) => {
          console.log(`  ${subSubdirectory}`);
          const subSubdirectoryPath = path.join(subdirectoryPath, subSubdirectory);
          const subSubSubdirectories = fs.readdirSync(subSubdirectoryPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

          subSubSubdirectories.forEach((subSubSubdirectory) => {
            console.log(`    ${subSubSubdirectory}`);
          });
        });
      });

      try {
        if (process.platform !== "darwin") {
          return;
        }
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
          path.join(buildPath, "afv", "libafv_native.dylib")
        );
      } catch (error) {
        console.error("An error occurred while copying the file:", error);
      }
    },
    packageAfterPrune: async (_, buildPath, __, platform) => {
      // This installs uiohook-napi
      const commands = [
        "install",
        "--no-bin-links",
        "--omit=dev",
        "--no--save",
        "--no-package-lock",
        "uiohook-napi",
      ];
      return new Promise((resolve, reject) => {
        // const cwd = process.cwd();
        const oldPckgJson = path.join(buildPath, "package.json");
        const newPckgJson = path.join(buildPath, "_package.json");

        fs.renameSync(oldPckgJson, newPckgJson);
        const npmInstall = spawn("npm", commands, {
          cwd: buildPath,
          stdio: "inherit",
          shell: true,
        });

        npmInstall.on("close", (code) => {
          if (code === 0) {
            fs.renameSync(newPckgJson, oldPckgJson);

            /**
             * On windows code signing fails for ARM binaries etc.,
             * we remove them here
             */
            if (platform === "win32") {
              const problematicPaths = [
                "darwin-x64",
                "darwin-arm64",
                "linux-arm64",
                "linux-x64",
              ];

              problematicPaths.forEach((binaryFolder) => {
                fs.rmSync(
                  path.join(
                    buildPath,
                    "node_modules",
                    "uiohook-napi",
                    "prebuilds",
                    binaryFolder
                  ),
                  { recursive: true, force: true }
                );
              });
            }

            // We now manually install the track-audio-afv package

            resolve();
          } else {
            reject(new Error("process finished with error code " + code));
          }
        });

        npmInstall.on("error", (error) => {
          reject(error);
        });
      });
    },
  },
};

export default config;

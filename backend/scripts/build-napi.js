const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const TA_PATH = path.join(__dirname, "..");

process.chdir(TA_PATH);

// Get arguments
const args = process.argv.slice(2); // Exclude the first two arguments (node and script file)

const debugFlagIndex = args.indexOf("--debug");
const isDebug = debugFlagIndex !== -1;

const fastFlagIndex = args.indexOf("--fast");
const isFast = fastFlagIndex !== -1;

const oldBuildPath = path.join(TA_PATH, "build", isDebug ? "Release" : "Debug");

console.log("Building N-API module...");

build();

async function build() {
  try {
    if (fs.existsSync(oldBuildPath)) {
      console.log("Removing existing build directory...");
      fs.rmSync(path.join(TA_PATH, "build"), { recursive: true, force: true });

      wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await wait(500);
    }
  } catch (error) {
    console.error(`Error while deleting directory: ${error}`);
    return;
  }

  try {

    const isWindows = /^win/.test(process.platform);

    if (isWindows) {
      const cmakeJsCommand = `npm run build:node --`;

      let  buildCommand = isDebug ? `${cmakeJsCommand} -D` : cmakeJsCommand;
      if (!isFast) {
        buildCommand += " --parallel 2";
      } else {
        buildCommand += " --parallel 8";
      }

      const buildProcess = spawn("cmd.exe", ["/c", buildCommand], { stdio: "inherit", shell: true });

      buildProcess.on("error", (error) => {
        console.error(`Error: ${error.message}`);
      });

      buildProcess.on("close", (code) => {
        if (code !== 0) {
          process.exit(code);
        }
        console.log("Build process completed successfully!");
      });
    } else {
      const buildCommand = "npm";

      const buildArgs = [
        "run",
        "build:node",
        "--",
      ];


      if (isDebug) {
        // Append -D if --debug flag is passed
        buildArgs.push("-D");
      }

      if (isFast) {
        buildArgs.push("--p=8");
      } else {
        buildArgs.push("--p=2");
      }

      console.log(`Build arguments: ${buildArgs.join(" ")}`);

      // Execute the build command through the shell
      const buildProcess = spawn(buildCommand, buildArgs, { stdio: "inherit", shell: true });

      buildProcess.on("error", (error) => {
        console.error(`Error: ${error.message}`);
      });

      buildProcess.on("close", (code) => {
        if (code !== 0) {
          process.exit(code);
        }
        console.log("Build process completed successfully!");

      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

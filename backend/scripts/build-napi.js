const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const TA_PATH = path.join(__dirname, "..");
process.chdir(TA_PATH);

const args = process.argv.slice(2);
const isDebug = args.includes("--debug");
const isFast = args.includes("--fast");
const isWindows = /^win/.test(process.platform);

const oldBuildPath = path.join(TA_PATH, "build", isDebug ? "Release" : "Debug");

console.log("Building N-API module...");

async function build() {
  try {
    if (fs.existsSync(oldBuildPath)) {
      console.log("Removing existing build directory...");
      fs.rmSync(path.join(TA_PATH, "build"), { recursive: true, force: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error(`Error while deleting directory: ${error}`);
    return;
  }

  try {
    // Construct cmake-js command
    const cmakeJsCommand = ['cmake-js'];
    if (isWindows) {
      cmakeJsCommand.push('-G', 'Ninja');
    }
    cmakeJsCommand.push('--out=build');

    if (isDebug) {
      cmakeJsCommand.push('-D');
    }

    cmakeJsCommand.push('--parallel', isFast ? '8' : '2');

    console.log(`Running command: ${cmakeJsCommand.join(' ')}`);

    const buildProcess = spawn(
      isWindows ? 'cmd.exe' : cmakeJsCommand[0],
      isWindows ? ['/c', cmakeJsCommand.join(' ')] : cmakeJsCommand.slice(1),
      {
        stdio: "inherit",
        shell: true
      }
    );

    return new Promise((resolve, reject) => {
      buildProcess.on("error", (error) => {
        console.error(`Error: ${error.message}`);
        reject(error);
      });

      buildProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Build process exited with code ${code}`));
        } else {
          console.log("Build process completed successfully!");
          resolve();
        }
      });
    });
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

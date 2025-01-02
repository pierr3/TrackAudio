// build-napi.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const isDebug = args.includes('--debug');
const isFast = args.includes('--fast');
const isWindows = process.platform === 'win32';

async function build() {
  // Clean up old build directory
  const buildPath = path.join(__dirname, '..', 'build');
  if (fs.existsSync(buildPath)) {
    console.log('Removing existing build directory...');
    await fs.promises.rm(buildPath, { recursive: true, force: true });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Prepare build command based on platform
  const buildCommand = isWindows ? {
    cmd: 'cmd.exe',
    args: ['/c', `cmake-js -G Ninja --out=build${isDebug ? ' -D' : ''}${isFast ? ' --parallel 8' : ' --parallel 2'}`]
  } : {
    cmd: 'cmake-js',
    args: [
      'build',
      '--out=build',
      ...(isDebug ? ['-D'] : []),
      '--parallel',
      isFast ? '8' : '2'
    ]
  };

  // Execute build
  return new Promise((resolve, reject) => {
    const buildProcess = spawn(buildCommand.cmd, buildCommand.args, {
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('error', reject);
    buildProcess.on('close', code => {
      if (code === 0) {
        console.log('Build completed successfully!');
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

// Execute build and handle errors
build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

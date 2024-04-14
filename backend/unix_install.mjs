import { execSync } from 'child_process';

// Function to change the rpath of the binary
function changeRpath(binaryPath) {
    try {
        // execSync(`install_name_tool -change "@rpath/libafv_native.dylib" "@loader_path/afv/libafv_native.dylib" ${binaryPath}`);
        // execSync(`install_name_tool -add_rpath "@loader_path/afv/" ${binaryPath}`);
        console.log('Rpath changed successfully!');
    } catch (error) {
        console.error('Error changing rpath:', error.message);
    }
}

// Function to codesign the binary on macOS
function codesignBinary(binaryPath, certificate) {
    try {
        // Run the 'codesign' command to sign the binary
        execSync(`codesign --timestamp -s "${certificate}" ${binaryPath}`);
        console.log(`${binaryPath} codesigned successfully!`);
    } catch (error) {
        console.error(`Error codesigning binary (${binaryPath}): `, error.message);
    }
}

// Path to the binary file
const binaryPath = 'build/Release/trackaudio-afv.node';
const libraryPath = process.platform === 'darwin' ? 'build/Release/libafv_native.dylib' : 'build/Release/libafv_native.so';

// Certificate for codesigning (only required on macOS)
const certificate = 'Developer ID Application';

// Change the rpath of the binary
if (process.platform === 'darwin' || process.platform === 'linux') {
    changeRpath(binaryPath);
}

// Codesign the binary on macOS
if (process.platform === 'darwin') {
    codesignBinary(binaryPath, certificate);
    codesignBinary(libraryPath, certificate);
}
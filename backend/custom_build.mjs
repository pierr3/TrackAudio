import { execSync } from 'child_process';

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

// Certificate for codesigning (only required on macOS)
const certificate = 'Developer ID Application';

// Codesign the binary on macOS
if (process.platform === 'darwin') {
    codesignBinary(binaryPath, certificate);
}




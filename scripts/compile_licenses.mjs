import { exec } from 'child_process';
import fs from 'fs';

// Requires npm install -g license-report

const command = 'license-report --config license_report_config.json --relatedTo.value=UI';
const outputFile = './LICENSES_COMPILED.md';

exec(`${command} > ${outputFile}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing command: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Command execution failed: ${stderr}`);
        return;
    }
    console.log(`Command executed successfully. Output saved to ${outputFile}`);

    // Append the content of the file LICENSE to LICENSES_COMPILED
    const licenseFile = './LICENSE';
    const licenseContent = fs.readFileSync(licenseFile, 'utf8');

    fs.appendFileSync(outputFile, licenseContent);
    console.log(`License content appended to ${outputFile}`);

    const backendLicenseFile = './backend/extern/afv-native/LICENSE';
    const backendLicenseContent = "# afv-native licenses\n" + fs.readFileSync(backendLicenseFile, 'utf8');

    fs.appendFileSync(outputFile, backendLicenseContent);
    console.log(`Backend license content appended to ${outputFile}`);

    const swiftLicenseFile = './backend/extern/SWIFT_LICENSE';
    const swiftLicenseContent = fs.readFileSync(swiftLicenseFile, 'utf8');

    fs.appendFileSync(outputFile, swiftLicenseContent);
    console.log(`Swift license content appended to ${outputFile}`);

    const fontLicense = './src/app/assets/fonts/LICENCE.txt';
    const fontLicenseContent = fs.readFileSync(fontLicense, 'utf8');

    fs.appendFileSync(outputFile, fontLicenseContent);
    console.log(`Font license content appended to ${outputFile}`);

    // const markedContent = marked(fs.readFileSync(outputFile, 'utf8'));
    // const htmlOutputFile = './LICENSES_COMPILED.html';
    // fs.writeFileSync(htmlOutputFile, markedContent);
    // console.log(`Output converted to HTML and saved to ${htmlOutputFile}`);
});

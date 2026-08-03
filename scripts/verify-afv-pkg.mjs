// Confirms the addon in node_modules is byte-identical to the one just built.
//
// pnpm resolves trackaudio-afv from a file: tarball whose version is always
// 1.0.0, so it can consider the dependency already satisfied and keep serving
// its cached copy. When that happens the build succeeds, the tarball is
// correct, and the app silently loads a stale native addon - which is
// indistinguishable from "the fix didn't work".

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BUILT = 'backend/build/Release/trackaudio-afv.node';
const INSTALLED = 'node_modules/trackaudio-afv/build/Release/trackaudio-afv.node';

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

let built, installed;
try {
  built = sha(BUILT);
} catch (e) {
  console.error(`\n  Cannot read the freshly built addon:\n    ${BUILT}\n    ${e.message}\n`);
  process.exit(1);
}
try {
  installed = sha(INSTALLED);
} catch (e) {
  console.error(`\n  Cannot read the installed addon:\n    ${INSTALLED}\n    ${e.message}\n`);
  process.exit(1);
}

if (built !== installed) {
  console.error(
    [
      '',
      '  Native addon in node_modules does NOT match the build output.',
      '  The app would load a stale binary.',
      '',
      `    built     ${built.slice(0, 16)}  ${BUILT}`,
      `    installed ${installed.slice(0, 16)}  ${INSTALLED}`,
      '',
      '  Fix: rm -rf node_modules/trackaudio-afv and reinstall,',
      '  or copy the built addon over the installed one.',
      ''
    ].join('\n')
  );
  process.exit(1);
}

console.log(`native addon verified - node_modules matches build output (${built.slice(0, 16)})`);

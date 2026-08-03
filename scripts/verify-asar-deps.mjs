// Confirms every dependency declared inside the packaged app.asar can actually
// be resolved from within it.
//
// .npmrc sets node-linker=hoisted. When two versions of a package exist, pnpm
// hoists one to the root of node_modules and nests the other. electron-builder
// walks the lockfile's production graph but copies from the hoisted path, so it
// can ship the wrong version of a package and omit that version's own
// dependencies. 1.4.0-beta.8 shipped p-limit@3.1.0 (hoisted, dev-only) where
// the graph expected p-limit@2.3.0, leaving out yocto-queue - the app threw
// "Cannot find module 'yocto-queue'" on the first electron-store require and
// never opened a window.
//
// Usage: node ./scripts/verify-asar-deps.mjs [path/to/app.asar]
// With no argument it checks every app.asar found under dist/.

import asar from '@electron/asar';
import { existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

// The runtime supplies these; they are never in node_modules.
const PROVIDED = new Set(['electron']);

const findArchives = () => {
  if (process.argv[2]) return [process.argv[2]];

  const candidates = [];
  if (!existsSync('dist')) return candidates;

  for (const entry of readdirSync('dist', { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const base = join('dist', entry.name);
    // macOS: <name>.app/Contents/Resources, Windows and Linux: resources
    const paths = [join(base, 'resources', 'app.asar')];
    for (const inner of readdirSync(base, { withFileTypes: true })) {
      if (inner.isDirectory() && inner.name.endsWith('.app')) {
        paths.push(join(base, inner.name, 'Contents', 'Resources', 'app.asar'));
      }
    }
    candidates.push(...paths.filter((p) => existsSync(p)));
  }
  return candidates;
};

// Node's resolution: walk up from the requiring package, checking each
// node_modules on the way. Paths inside an asar are always posix.
const resolves = (name, fromDir, present) => {
  let dir = fromDir;
  for (;;) {
    if (present.has(posix.join(dir, 'node_modules', name))) return true;
    if (dir === '' || dir === '/') return false;
    dir = posix.dirname(dir);
    if (dir === '.') return false;
  }
};

const checkArchive = (archive) => {
  const entries = asar.listPackage(archive);

  // An installed package sits directly under node_modules, or under
  // node_modules/@scope. Anything deeper is a folder that happens to carry a
  // package.json (fast-uri/benchmark, for one) and is not resolvable by name.
  const isInstalledPackage = (dir) => {
    const parts = dir.split('/');
    const parent = parts[parts.length - 2];
    const grandparent = parts[parts.length - 3];
    return parent === 'node_modules' || (parent?.startsWith('@') && grandparent === 'node_modules');
  };

  const pkgDirs = entries
    .filter((e) => e.endsWith('/package.json') && e.includes('/node_modules/'))
    .map((e) => posix.dirname(e))
    .filter(isInstalledPackage);
  const present = new Set(pkgDirs);

  const missing = [];
  for (const dir of pkgDirs) {
    let meta;
    try {
      meta = JSON.parse(asar.extractFile(archive, posix.join(dir, 'package.json').slice(1)));
    } catch {
      continue; // not a readable manifest, nothing to verify
    }
    for (const dep of Object.keys(meta.dependencies ?? {})) {
      if (PROVIDED.has(dep)) continue;
      if (!resolves(dep, dir, present)) {
        missing.push(`${meta.name}@${meta.version} requires ${dep}  (${dir})`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      [
        '',
        `  ${archive}`,
        `  ${missing.length} dependency/dependencies missing from the package:`,
        '',
        ...missing.map((m) => `    ${m}`),
        '',
        '  The app will throw "Cannot find module" at runtime.',
        '  Fix: pin the offending package to one version via pnpm.overrides',
        '  in package.json, reinstall, and repackage.',
        ''
      ].join('\n')
    );
    return false;
  }

  console.log(`${archive}: ${pkgDirs.length} packages, all dependencies resolve`);
  return true;
};

const archives = findArchives();
if (archives.length === 0) {
  console.error('\n  No app.asar found. Package the app first, or pass a path.\n');
  process.exit(1);
}

if (!archives.map(checkArchive).every(Boolean)) process.exit(1);

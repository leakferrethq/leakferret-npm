#!/usr/bin/env node
'use strict';

// Generate the per-platform packages that @leakferret/cli lists as
// optionalDependencies (@leakferret/cli-<plat>). Each one bundles the native
// binary so `npm install` ships it through npm with no download.
//
// This is a PUBLISH-TIME step, not an install-time one. It downloads the pinned
// release binaries, verifies each against its SHA256, and writes ready-to-pack
// package dirs under dist/. Publish order: these platform packages first, then
// @leakferret/cli, then @leakferret/mcp.
//
//   node scripts/build-platform-packages.js
//   for d in dist/*/; do (cd "$d" && npm publish --access public); done

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

// The native binary release these packages bundle. Bump together with CHECKSUMS
// on every binary release. Decoupled from the npm package version.
const BINARY_VERSION = process.env.LEAKFERRET_BINARY_VERSION || '0.1.9';

// npm package version for the generated platform packages: matches @leakferret/cli.
const PKG_VERSION = require('../packages/cli/package.json').version;

// SHA256 of each release tarball, pinned to BINARY_VERSION. The download is
// verified against these before a binary is written into a package, so a
// tampered or corrupted asset is never published.
const CHECKSUMS = {
  'x86_64-unknown-linux-gnu': 'ba28ac5ef5a44d47f162f3c424c1465da5bbd17fb7292f60d3bd3cf3b2d362a4',
  'x86_64-apple-darwin':      '3af3d7f22a8d127053df123033b0b6777701310733d643406754423d6b1d3912',
  'aarch64-apple-darwin':     '363b1da65bf34d2c89c37aa2e00eaa03d49c8595cc5b8bb752a344dacf21d7da',
  'x86_64-pc-windows-msvc':   '3f038f55cfded63ebc2f8c16c1edbdd1ddcd36ae43a872b91f5aaeed93438fc1',
  'aarch64-pc-windows-msvc':  'b009e852af7eb73dc203e9cb343bec80a1727075d6a35be4ff9567191fd57ca9',
};

const TARGETS = [
  { name: 'cli-linux-x64',    os: 'linux',  cpu: 'x64',   triple: 'x86_64-unknown-linux-gnu', bin: 'leakferret' },
  { name: 'cli-darwin-x64',   os: 'darwin', cpu: 'x64',   triple: 'x86_64-apple-darwin',      bin: 'leakferret' },
  { name: 'cli-darwin-arm64', os: 'darwin', cpu: 'arm64', triple: 'aarch64-apple-darwin',     bin: 'leakferret' },
  { name: 'cli-win32-x64',    os: 'win32',  cpu: 'x64',   triple: 'x86_64-pc-windows-msvc',   bin: 'leakferret.exe' },
  { name: 'cli-win32-arm64',  os: 'win32',  cpu: 'arm64', triple: 'aarch64-pc-windows-msvc',  bin: 'leakferret.exe' },
];

function log(msg) {
  process.stderr.write(`[build-platform-packages] ${msg}\n`);
}

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        resolve(download(res.headers.location, redirects + 1));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Minimal gunzip + tar reader: return the first entry whose basename matches.
function extractFromTarGz(gzBuf, want) {
  const buf = zlib.gunzipSync(gzBuf);
  let offset = 0;
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (name === '') break;
    const sizeOctal = header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const dataStart = offset + 512;
    if (name.split('/').pop() === want && size > 0) {
      return buf.subarray(dataStart, dataStart + size);
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return null;
}

async function buildTarget(t) {
  const expected = CHECKSUMS[t.triple];
  if (!expected) throw new Error(`no pinned checksum for ${t.triple}`);

  const url =
    `https://github.com/leakferrethq/leakferret/releases/download/v${BINARY_VERSION}/` +
    `leakferret-${BINARY_VERSION}-${t.triple}.tar.gz`;
  log(`${t.name}: downloading ${url}`);
  const gz = await download(url);

  const actual = crypto.createHash('sha256').update(gz).digest('hex');
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`checksum mismatch for ${t.triple}\n  expected ${expected}\n  got      ${actual}`);
  }

  const binBytes = extractFromTarGz(gz, t.bin);
  if (!binBytes) throw new Error(`binary ${t.bin} not found inside ${url}`);

  const pkgName = `@leakferret/${t.name}`;
  const dir = path.join(__dirname, '..', 'dist', t.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });

  const binPath = path.join(dir, 'bin', t.bin);
  fs.writeFileSync(binPath, binBytes);
  if (t.os !== 'win32') fs.chmodSync(binPath, 0o755);

  const pkg = {
    name: pkgName,
    version: PKG_VERSION,
    description: `leakferret native binary for ${t.os}-${t.cpu}. Installed automatically by @leakferret/cli.`,
    license: 'MIT',
    homepage: 'https://github.com/leakferrethq/leakferret',
    repository: { type: 'git', url: 'https://github.com/leakferrethq/leakferret-npm' },
    os: [t.os],
    cpu: [t.cpu],
    files: ['bin/'],
    preferUnplugged: true,
  };
  fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  fs.copyFileSync(path.join(__dirname, '..', 'packages', 'cli', 'LICENSE'), path.join(dir, 'LICENSE'));
  log(`${t.name}: wrote ${dir} (${pkgName}@${PKG_VERSION})`);
}

(async () => {
  for (const t of TARGETS) {
    await buildTarget(t);
  }
  log(`done. ${TARGETS.length} platform packages in dist/. Publish them before @leakferret/cli.`);
})().catch((e) => {
  log(`failed: ${e && e.message ? e.message : e}`);
  process.exit(1);
});

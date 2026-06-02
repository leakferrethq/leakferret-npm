#!/usr/bin/env node
'use strict';

// Postinstall: download the right platform binary from GitHub Releases
// and unpack it into ./vendor/. Skipped if LEAKFERRET_SKIP_DOWNLOAD
// is set (useful for air-gapped CI).
//
// Pattern matches esbuild / biome / @swc/core — npm packages that
// wrap a native binary.

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { detectPlatform, binaryName } = require('../lib/platform');

// The native binary release this package downloads. Decoupled from the npm
// package version (like the Ruby gem's BINARY_VERSION) so a wrapper-only change
// can ship without a matching binary release. Bump together with CHECKSUMS on
// every binary release.
const BINARY_VERSION = '0.1.7';

// SHA256 of each release tarball, pinned to BINARY_VERSION. The download is
// verified against these before extraction, so a tampered or corrupted release
// asset is rejected rather than executed. Because the digests live in the
// published package, auditing the package tells you exactly which binary bytes
// it will run. Regenerate on every binary bump from the `*.tar.gz.sha256` files.
const CHECKSUMS = {
  'aarch64-apple-darwin': '24542d75ff0b16094f49d9b2e5cb7246b9247159e7d0e6b6741edb42522f0beb',
  'aarch64-pc-windows-msvc': 'f1edae2de62386847be51f357ca0ebe3af6777b85ddef37fd7d17d005e8aa770',
  'x86_64-apple-darwin': 'f69adcdaebebd3edddb2e0e9bfd2167ea12324447959638f73707807fa792fcd',
  'x86_64-pc-windows-msvc': 'fa7dab267cac4c35bf31dabb479910f227a28ec4ef266082a5d57f016925835e',
  'x86_64-unknown-linux-gnu': 'bfc5fc3763a4a573ecaf9406c2b3ab7b06fc74a88523e6ec906527ec58e5df0c',
};

function log(msg) {
  process.stderr.write(`[@leakferret/cli/postinstall] ${msg}\n`);
}

// Extract in pure JS (gunzip + a minimal tar reader) rather than shelling out
// to `tar`, which on Windows mis-reads `C:\...` as a remote host and fails.
// Returns the bytes of the first entry whose basename matches `want`; the
// archive nests everything under leakferret-<version>-<triple>/.
function extractFromTarGz(gzBuf, want) {
  const buf = zlib.gunzipSync(gzBuf);
  let offset = 0;
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (name === '') break; // end-of-archive padding
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

if (process.env.LEAKFERRET_SKIP_DOWNLOAD) {
  log('LEAKFERRET_SKIP_DOWNLOAD set; skipping binary download.');
  process.exit(0);
}

const triple = detectPlatform();
const vendorDir = path.join(__dirname, '..', 'vendor');
const dest = path.join(vendorDir, binaryName());

if (fs.existsSync(dest)) {
  log(`binary already present at ${dest}; skipping download.`);
  process.exit(0);
}

fs.mkdirSync(vendorDir, { recursive: true });

const url = `https://github.com/leakferrethq/leakferret/releases/download/v${BINARY_VERSION}/leakferret-${BINARY_VERSION}-${triple}.tar.gz`;
log(`downloading ${url}`);

const tmp = path.join(vendorDir, `leakferret-${BINARY_VERSION}-${triple}.tar.gz`);

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      if ([301, 302, 307, 308].includes(resp.statusCode) && resp.headers.location && redirects < 5) {
        resolve(download(resp.headers.location, dest, redirects + 1));
        return;
      }
      if (resp.statusCode !== 200) {
        reject(new Error(`HTTP ${resp.statusCode} fetching ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      resp.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  try {
    await download(url, tmp);

    // Verify the tarball against the pinned hash BEFORE extracting or running
    // anything. A mismatch means the bytes are not what this package was
    // published against, so fail hard rather than execute them.
    const expected = CHECKSUMS[triple];
    if (!expected) {
      fs.unlinkSync(tmp);
      log(`no pinned checksum for ${triple}; refusing to install an unverified binary.`);
      process.exit(1);
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(tmp)).digest('hex');
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      fs.unlinkSync(tmp);
      log(`checksum mismatch for ${url}`);
      log(`  expected ${expected}`);
      log(`  got      ${actual}`);
      log('refusing to install a binary that does not match the pinned hash.');
      process.exit(1);
    }

    // Unpack the verified tarball in pure JS so this works identically on
    // Windows (no external `tar`). The binary lands directly in vendor/.
    const bin = extractFromTarGz(fs.readFileSync(tmp), binaryName());
    if (!bin) {
      throw new Error(`binary ${binaryName()} not found inside ${tmp}`);
    }
    fs.writeFileSync(dest, bin);
    fs.unlinkSync(tmp);
    if (process.platform !== 'win32') {
      fs.chmodSync(dest, 0o755);
    }
    log(`installed binary at ${dest}`);
  } catch (e) {
    log(`download failed: ${e && e.message ? e.message : e}`);
    log('package still installed; the binary will error clearly on first invocation.');
    process.exit(0);
  }
})();

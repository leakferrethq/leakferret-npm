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
const { execFileSync } = require('node:child_process');
const { detectPlatform, binaryName } = require('../lib/platform');

const pkg = require('../package.json');
const VERSION = pkg.version;

function log(msg) {
  process.stderr.write(`[@leakferret/cli/postinstall] ${msg}\n`);
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

const url = `https://github.com/leakferrethq/leakferret/releases/download/v${VERSION}/leakferret-${VERSION}-${triple}.tar.gz`;
log(`downloading ${url}`);

const tmp = path.join(vendorDir, `leakferret-${VERSION}-${triple}.tar.gz`);

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
    // Cross-platform extraction: prefer the system `tar`; fall back
    // would be to use a JS gunzip lib, but we want to keep zero
    // runtime deps.
    execFileSync('tar', ['-xzf', tmp, '-C', vendorDir], { stdio: 'inherit' });
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

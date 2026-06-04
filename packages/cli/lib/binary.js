'use strict';

const fs = require('node:fs');
const { binaryName, platformPackage } = require('./platform');

// Resolve the native binary. There is no download: the binary ships inside a
// per-platform optionalDependency (@leakferret/cli-<plat>), and npm installs
// only the one matching this host. We resolve it out of node_modules. Nothing
// here touches the network, so `npm pack`/audit shows no fetch-and-run code.
function resolveBinary() {
  const override = process.env.LEAKFERRET_BIN;
  if (override) {
    if (!fs.existsSync(override)) {
      const e = new Error(`LEAKFERRET_BIN points to a missing file: ${override}`);
      e.code = 'LEAKFERRET_BIN_NOT_FOUND';
      throw e;
    }
    return override;
  }

  const pkg = platformPackage();
  if (pkg) {
    try {
      const bin = require.resolve(`${pkg}/bin/${binaryName()}`);
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(bin, 0o755);
        } catch {
          // best effort; npm usually preserves the published mode
        }
      }
      return bin;
    } catch {
      // optional dependency not installed (e.g. --no-optional, or a partial
      // install); fall through to the build-from-source message.
    }
  }

  const err = new Error(noBinaryMessage());
  err.code = 'LEAKFERRET_BIN_NOT_FOUND';
  throw err;
}

function noBinaryMessage() {
  const host = `${process.platform}-${process.arch}`;
  return [
    `No prebuilt leakferret binary is installed for this platform (${host}).`,
    '',
    'leakferret ships precompiled packages for linux-x64, darwin-x64,',
    'darwin-arm64, win32-x64, and win32-arm64. On any other platform, or if the',
    'optional package was skipped, provide the binary yourself:',
    '',
    '  1. Build from source and point LEAKFERRET_BIN at it:',
    '       cargo install leakferret-cli',
    '       export LEAKFERRET_BIN="$(command -v leakferret)"',
    '',
    '  2. Download a release binary from',
    '       https://github.com/leakferrethq/leakferret/releases',
    '     and set LEAKFERRET_BIN to its absolute path.',
  ].join('\n');
}

module.exports = { resolveBinary };

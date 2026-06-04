'use strict';

function detectPlatform() {
  const arch = process.arch;
  const platform = process.platform;
  let cpu;
  if (arch === 'x64')     cpu = 'x86_64';
  else if (arch === 'arm64') cpu = 'aarch64';
  else throw new Error(`unsupported CPU arch: ${arch}`);

  if (platform === 'linux') {
    if (cpu === 'aarch64') throw new Error('aarch64-linux has no prebuilt binary yet; build from source');
    return `${cpu}-unknown-linux-gnu`;
  }
  if (platform === 'darwin') return `${cpu}-apple-darwin`;
  if (platform === 'win32')  return `${cpu}-pc-windows-msvc`;
  throw new Error(`unsupported platform: ${platform}`);
}

function binaryName() {
  return process.platform === 'win32' ? 'leakferret.exe' : 'leakferret';
}

// The per-platform package that carries the native binary for this host, listed
// as an optionalDependency of @leakferret/cli. npm installs only the one whose
// os/cpu match, the way esbuild and @swc/core ship. Returns undefined on a
// platform we do not publish a binary for.
const PLATFORM_PACKAGES = {
  'linux-x64':    '@leakferret/cli-linux-x64',
  'darwin-x64':   '@leakferret/cli-darwin-x64',
  'darwin-arm64': '@leakferret/cli-darwin-arm64',
  'win32-x64':    '@leakferret/cli-win32-x64',
  'win32-arm64':  '@leakferret/cli-win32-arm64',
};

function platformPackage() {
  return PLATFORM_PACKAGES[`${process.platform}-${process.arch}`];
}

module.exports = { detectPlatform, binaryName, platformPackage, PLATFORM_PACKAGES };

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

module.exports = { detectPlatform, binaryName };

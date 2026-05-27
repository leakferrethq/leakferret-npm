'use strict';

function detectPlatform() {
  const arch = process.arch;
  const platform = process.platform;
  let cpu;
  if (arch === 'x64')     cpu = 'x86_64';
  else if (arch === 'arm64') cpu = 'aarch64';
  else throw new Error(`unsupported CPU arch: ${arch}`);

  if (platform === 'linux')  return `${cpu}-unknown-linux-gnu`;
  if (platform === 'darwin') return `${cpu}-apple-darwin`;
  if (platform === 'win32')  return `${cpu}-pc-windows-gnu`;
  throw new Error(`unsupported platform: ${platform}`);
}

function binaryName() {
  return process.platform === 'win32' ? 'leakferret.exe' : 'leakferret';
}

module.exports = { detectPlatform, binaryName };

'use strict';

const { spawnSync } = require('node:child_process');
const { resolveBinary } = require('./binary');
const { detectPlatform, binaryName } = require('./platform');

function invoke(args) {
  const bin = resolveBinary();
  const res = spawnSync(bin, args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  // Exit 1 is "findings present" — not an error.
  if (res.status && res.status !== 1) {
    const err = new Error(`leakferret exited ${res.status}: ${res.stderr || ''}`);
    err.exitStatus = res.status;
    err.stderr = res.stderr;
    throw err;
  }
  if (!res.stdout || res.stdout.trim() === '') return [];
  return JSON.parse(res.stdout);
}

function flags(opts = {}) {
  const out = [];
  for (const g of opts.excludes || []) out.push('--exclude', g);
  for (const p of opts.only || []) out.push('--only', p);
  if (opts.showFixtures) out.push('--show-fixtures');
  return out;
}

function scan(path = '.', opts = {}) {
  return invoke(['scan', path, '--format', 'json', ...flags(opts)]);
}

function verify(path = '.', opts = {}) {
  const args = [
    'verify', path,
    '--format', 'json',
    '--verify-mode', opts.mode || 'best-effort',
    '--verifier-timeout-secs', String(opts.timeout ?? 10),
  ];
  return invoke([...args, ...flags(opts)]);
}

function rewrite(path = '.', opts = {}) {
  const args = ['rewrite', path, '--format', 'json', '--backend', opts.backend || 'env'];
  if (opts.apply) args.push('--apply');
  return invoke([...args, ...flags(opts)]);
}

function binaryPath() {
  return resolveBinary();
}

module.exports = {
  scan,
  verify,
  rewrite,
  binaryPath,
  detectPlatform,
  binaryName,
};

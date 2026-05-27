'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { binaryName } = require('./platform');

function resolveBinary() {
  if (process.env.LEAKFERRET_BIN) {
    return process.env.LEAKFERRET_BIN;
  }
  const vendored = path.join(__dirname, '..', 'vendor', binaryName());
  if (fs.existsSync(vendored)) return vendored;
  const msg = [
    `leakferret binary not found at ${vendored}`,
    '',
    'Try re-installing:',
    '  npm install @leakferret/cli',
    '',
    'Or download a release manually:',
    '  https://github.com/leakferrethq/leakferret/releases',
    '',
    'and set LEAKFERRET_BIN to its absolute path.',
  ].join('\n');
  const err = new Error(msg);
  err.code = 'LEAKFERRET_BIN_NOT_FOUND';
  throw err;
}

module.exports = { resolveBinary };

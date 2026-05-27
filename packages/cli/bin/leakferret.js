#!/usr/bin/env node
'use strict';

// Pass-through to the bundled native binary. Same CLI as the Rust crate.

const { spawnSync } = require('node:child_process');
const { resolveBinary } = require('../lib/binary');

const bin = resolveBinary();
const result = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit' });

if (result.error) {
  process.stderr.write(`leakferret: failed to invoke binary: ${result.error.message}\n`);
  process.exit(2);
}
process.exit(result.status ?? 0);

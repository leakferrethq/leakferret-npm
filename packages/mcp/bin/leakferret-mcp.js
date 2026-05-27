#!/usr/bin/env node
'use strict';

// Spawns the native `leakferret mcp` subcommand. The native binary
// already speaks JSON-RPC 2.0 over stdio per the MCP spec — we just
// inherit stdio.

const { spawn } = require('node:child_process');
const { binaryPath } = require('@leakferret/cli');

const bin = binaryPath();
const child = spawn(bin, ['mcp'], { stdio: 'inherit' });

child.on('exit', (code, sig) => process.exit(sig ? 1 : (code ?? 0)));
child.on('error', (err) => {
  process.stderr.write(`leakferret-mcp: ${err.message}\n`);
  process.exit(2);
});

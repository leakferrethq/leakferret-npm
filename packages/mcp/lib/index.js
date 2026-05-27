'use strict';

// Programmatic entry — start an MCP server on stdio. The same JSON-RPC
// loop the binary runs; this is just a thin spawn for embedding.

const { spawn } = require('node:child_process');
const { binaryPath } = require('@leakferret/cli');

function start({ stdin = process.stdin, stdout = process.stdout, stderr = process.stderr } = {}) {
  const bin = binaryPath();
  const child = spawn(bin, ['mcp'], { stdio: ['pipe', 'pipe', stderr] });
  stdin.pipe(child.stdin);
  child.stdout.pipe(stdout);
  return child;
}

module.exports = { start };

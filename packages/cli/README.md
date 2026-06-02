<p align="center">
  <img src="https://raw.githubusercontent.com/leakferrethq/leakferret/master/brand/logo.png" alt="leakferret" width="360">
</p>

# @leakferret/cli

> Context-aware secret scanner. Finds hardcoded secrets, confirms which ones are **actually live**, and rewrites them to read from the environment.

[![npm](https://img.shields.io/npm/v/@leakferret/cli?logo=npm)](https://www.npmjs.com/package/@leakferret/cli)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leakferrethq/leakferret/blob/master/LICENSE.txt)

<p align="center">
  <img src="https://raw.githubusercontent.com/leakferrethq/leakferret/master/brand/demo.gif" alt="leakferret finds, verifies, and rewrites a leaked secret" width="760">
</p>

The npm distribution of [`leakferret`](https://github.com/leakferrethq/leakferret).
This package contains no scanning logic of its own: it ships a small JS shim plus
a `postinstall` that downloads the prebuilt, statically-linked binary (written in
Rust) from GitHub Releases into `vendor/`, then shells out to it. Same pattern as
`esbuild`, `biome`, and `@swc/core`.

## What it does

leakferret finds hardcoded secrets and API keys and helps you remove them, in
five stations:

1. **Scan** — regex pre-filter over your files; respects `.gitignore` and also
   reads dotfiles like `.env`.
2. **Catalog** — a signed database of known-public example credentials (Stripe
   test keys, `AKIAIOSFODNN7EXAMPLE`, jwt.io samples) so documented examples are
   marked `FIXTURE` instead of false-alarming.
3. **Classify** — a `REAL` / `FIXTURE` / `UNKNOWN` verdict, from offline
   heuristics or by asking the host editor/agent's language model — **no extra
   API key, no cost**.
4. **Verify** — a real but harmless API call to the provider (AWS SigV4, GitHub,
   GitLab, Stripe, OpenAI, Anthropic, Slack, Twilio, SendGrid, Mailgun, Datadog,
   Heroku, npm, PyPI, DigitalOcean) to confirm a key is live, plus a trufflehog
   fallback.
5. **Rewrite** — swap a hardcoded literal for an environment-variable lookup
   (`process.env`), add a `.env.example` line, and print secret-manager seed
   commands.

**Privacy invariant:** the full secret value never leaves your machine. Only a
redacted first-4-plus-last-4 preview (e.g. `AKIA...4XYZ`) is ever written to a
report, log, network message, or model prompt. Verification calls go straight
from your machine to the provider — leakferret has no servers.

## Install

```bash
npm install -D @leakferret/cli
# or
pnpm add -D @leakferret/cli
# or one-off:
npx @leakferret/cli scan .
```

Postinstall downloads `leakferret-{version}-{triple}.tar.gz` from GitHub Releases
into `node_modules/@leakferret/cli/vendor/`. Node >= 18 on Linux, macOS, Windows.

## CLI

Same shape as the upstream Rust binary:

```bash
leakferret scan .                              # regex pre-filter only (offline)
leakferret verify . --only-verified            # scan + classify + live verify
leakferret rewrite . --apply --backend doppler # propose/apply env-var rewrites
leakferret baseline init                       # fail only on NEW secrets in CI
leakferret catalog info
leakferret mcp                                 # MCP server on stdio
```

`leakferret scan --git` walks commit history. Output formats are `pretty`,
`json`, and `sarif` (for GitHub Code Scanning). Exit codes: `0` = clean,
`1` = findings.

## Programmatic API

```js
const { scan, verify, rewrite } = require('@leakferret/cli');

const findings = verify('.', { mode: 'only-verified' });
for (const f of findings) {
  console.log(`${f.path}:${f.line} ${f.pattern} [${f.verdict}] ${f.match_redacted}`);
}
```

`scan`, `verify`, and `rewrite` return `Finding[]`. TypeScript types are bundled
(`lib/index.d.ts`); helpers `binaryPath()`, `binaryName()`, and `detectPlatform()`
are exported too.

## Block commits locally (pre-commit hook)

Catch a secret before it is ever committed. From your repo root:

```bash
cat > .git/hooks/pre-commit <<'HOOK'
#!/bin/sh
# Offline secret scan (no network). Blocks the commit on any finding.
leakferret verify . --verify-mode none --fail-on any || {
  echo "leakferret blocked this commit. Bypass: git commit --no-verify"
  exit 1
}
HOOK
chmod +x .git/hooks/pre-commit
```

`--verify-mode none` keeps it offline; `--fail-on any` exits non-zero on any
non-fixture finding. Pair with `leakferret baseline init` to block only on *new*
secrets.

## Use it in CI

```bash
npm i -g @leakferret/cli
leakferret baseline init      # commit .leakferret-baseline.json
leakferret verify .           # exits 1 on any REAL finding
```

On GitHub, the [leakferret action](https://github.com/marketplace/actions/leakferret)
uploads SARIF to Code Scanning. Add `--format sarif` for a report or
`--only-verified` to fail only on provider-confirmed live keys.

## Use it with AI agents (MCP)

The companion [`@leakferret/mcp`](https://www.npmjs.com/package/@leakferret/mcp)
package is an MCP server, so a coding agent (Claude Code, Cursor, Continue) can
scan, verify, and rewrite secrets **before it writes a commit**:

```json
{ "mcpServers": { "leakferret": { "command": "npx", "args": ["@leakferret/mcp"] } } }
```

## Air-gapped / offline

Set `LEAKFERRET_SKIP_DOWNLOAD=1` to skip the postinstall download and point
`LEAKFERRET_BIN` at a pre-positioned binary:

```bash
export LEAKFERRET_BIN=/opt/leakferret/leakferret
```

## License

MIT for this package and the bundled binary. The fixture catalog **data** is
CC-BY-SA-4.0 — see [`leakferret-catalog`](https://github.com/leakferrethq/leakferret-catalog).

---

Part of [leakferret](https://github.com/leakferrethq/leakferret) ·
[leakferret.com](https://leakferret.com) ·
maintained by Maria Khan.

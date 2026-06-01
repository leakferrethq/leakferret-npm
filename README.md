<p align="center">
  <img src="assets/logo.png" alt="leakferret" width="380">
</p>

# leakferret (npm)

> MCP-native secret scanner — verified findings, agent-applied rewrites.

<p align="center">
  <img src="https://raw.githubusercontent.com/leakferrethq/leakferret/master/brand/demo.gif" alt="leakferret finds, verifies, and rewrites a leaked secret" width="760">
</p>

npm monorepo for the JavaScript distribution of
[`leakferret`](https://github.com/leakferrethq/leakferret). Neither package
contains scanning logic: each ships a small JS shim plus a `postinstall.js` that
downloads the prebuilt, statically-linked binary (written in Rust) from GitHub
Releases into `vendor/`, and shells out to it. Same pattern as `esbuild`,
`biome`, and `@swc/core`.

## Packages

| Package | Purpose |
|---|---|
| [`@leakferret/cli`](./packages/cli) | CLI and programmatic API. Downloads and bundles the native binary. |
| [`@leakferret/mcp`](./packages/mcp) | MCP server for AI coding agents. Depends on `@leakferret/cli`. |

Both target Node >= 18 on Linux, macOS, and Windows.

## What leakferret does

leakferret finds hardcoded secrets and API keys in your code and helps you
remove them, in five stations:

1. **Scan** — regex pre-filter over files; respects `.gitignore` and also reads
   dotfiles like `.env`.
2. **Catalog** — a signed database of known-public example credentials (Stripe
   test keys, `AKIAIOSFODNN7EXAMPLE`, jwt.io samples) so documented examples are
   marked `FIXTURE` instead of false-alarming.
3. **Classify** — a `REAL` / `FIXTURE` / `UNKNOWN` verdict, from offline
   heuristics or by asking the host editor/agent language model (no extra API
   key, no cost).
4. **Verify** — a real but harmless API call to the provider (AWS SigV4,
   GitHub, GitLab, Stripe, OpenAI, Anthropic, Slack, Twilio, SendGrid, Mailgun,
   Datadog, Heroku, npm, PyPI, DigitalOcean) to confirm a key is live, plus a
   trufflehog fallback.
5. **Rewrite** — swap a hardcoded literal for an environment-variable lookup
   (`process.env`, `os.environ`, `ENV.fetch`), add a `.env.example` line, and
   print secret-manager seed commands.

**Privacy invariant:** the full secret value never leaves your machine. Only a
redacted first-4-plus-last-4 preview (e.g. `AKIA...4XYZ`) is ever written to a
report, log, network message, or model prompt. Verification calls go straight
from your machine to the provider — leakferret has no servers.

## @leakferret/cli

The scanner CLI and a programmatic JavaScript API.

### Install

```bash
npm install -D @leakferret/cli
# or
pnpm add -D @leakferret/cli
# or one-off:
npx @leakferret/cli scan .
```

Postinstall downloads `leakferret-{version}-{triple}.tar.gz` from GitHub
Releases into `node_modules/@leakferret/cli/vendor/`.

### CLI

Same shape as the upstream Rust binary:

```bash
leakferret scan .
leakferret verify . --only-verified
leakferret rewrite . --apply --backend doppler
leakferret baseline init
leakferret catalog info
leakferret mcp                 # MCP server on stdio
```

`leakferret scan --git` walks commit history. Output formats are `pretty`,
`json`, and `sarif` (for GitHub Code Scanning).

### Programmatic API

```js
const { scan, verify, rewrite } = require('@leakferret/cli');

const findings = verify('.', { mode: 'only-verified' });
for (const f of findings) {
  console.log(`${f.path}:${f.line} ${f.pattern} [${f.verdict}] ${f.match_redacted}`);
}
```

TypeScript types are bundled (`lib/index.d.ts`): `scan`, `verify`, and `rewrite`
return `Finding[]`, and helpers `binaryPath()`, `binaryName()`, and
`detectPlatform()` are exported.

## @leakferret/mcp

An [MCP](https://modelcontextprotocol.io) (Model Context Protocol) server that
gives AI coding agents tools to scan, classify, verify, and rewrite findings
before producing edits. The pitch: agents hardcode secrets too, and nobody
reviews their output line by line — this lets the agent self-check before it
commits. Works with Claude Code, Cursor, Continue, and Claude Desktop.

### Install and run

```bash
npm install @leakferret/mcp     # pulls in @leakferret/cli + the native binary
npx @leakferret/mcp             # JSON-RPC 2.0 over stdio
```

### Hook into Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "leakferret": {
      "command": "npx",
      "args": ["@leakferret/mcp"]
    }
  }
}
```

### Hook into Cursor

Settings → MCP Servers → add command `npx @leakferret/mcp`.

### Tools exposed

| Tool | Purpose |
|---|---|
| `scan_repository` | Walk a path, return regex-pre-filter candidates |
| `classify_candidates` | Apply offline heuristic verdicts |
| `verify_finding` | Live HTTP verify against the provider |
| `propose_rewrite` | Propose an `ENV.fetch`-style replacement for a real finding |
| `baseline_diff` | Diff a scan against the repo baseline |

Plus a `classify` prompt — the system prompt the host model uses to classify
candidates inline.

## Use it in CI

`@leakferret/cli` is one binary with clear exit codes (`0` = clean, `1` =
findings), so it drops into any CI. Baseline once so you only fail on *new*
secrets, then `verify` on every build:

```bash
npm i -g @leakferret/cli
leakferret baseline init      # commit .leakferret-baseline.json (the salt is gitignored)
leakferret verify .           # exits 1 on any REAL finding
```

- **GitHub Actions:** use the
  [action](https://github.com/leakferrethq/leakferret-action) (uploads SARIF to
  Code Scanning), or run the CLI directly.
- **CircleCI / GitLab CI / Argo Workflows / Jenkins:** identical recipe —
  `npm i -g @leakferret/cli && leakferret verify .`. Add `--format sarif` for a
  report, or `--only-verified` to fail only on provider-confirmed live keys.

## Using a local binary

Every leakferret wrapper honors the `LEAKFERRET_BIN` environment variable. Point
it at a binary on disk and the wrapper runs that instead of the downloaded copy:

```bash
export LEAKFERRET_BIN=/opt/leakferret/leakferret
npx leakferret scan .
```

For air-gapped or offline installs, set `LEAKFERRET_SKIP_DOWNLOAD=1` to skip the
postinstall download and provide the binary yourself.

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
non-fixture finding (documented examples like `AKIAIOSFODNN7EXAMPLE` are still
ignored). Pair with `leakferret baseline init` to block only on *new* secrets,
or commit the hook to `.githooks/` and run `git config core.hooksPath .githooks`
to share it with a team.

## License

MIT for both packages and the bundled binary. The fixture catalog **data** is
CC-BY-SA-4.0 — see [`leakferret-catalog`](https://github.com/leakferrethq/leakferret-catalog).

---

Part of [leakferret](https://github.com/leakferrethq/leakferret) ·
[leakferret.com](https://leakferret.com) ·
maintained by Maria Khan &lt;missusk@protonmail.com&gt;.

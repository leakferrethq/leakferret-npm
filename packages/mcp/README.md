<p align="center">
  <img src="https://raw.githubusercontent.com/leakferrethq/leakferret/master/brand/logo.png" alt="leakferret" width="360">
</p>

# @leakferret/mcp

> An MCP server that lets a coding agent scan, verify, and rewrite secrets **before it writes a commit**.

[![npm](https://img.shields.io/npm/v/@leakferret/mcp?logo=npm)](https://www.npmjs.com/package/@leakferret/mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-leakferret-6f42c1)](https://registry.modelcontextprotocol.io)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leakferrethq/leakferret/blob/master/LICENSE.txt)

<p align="center">
  <img src="https://raw.githubusercontent.com/leakferrethq/leakferret/master/brand/demo.gif" alt="leakferret finds, verifies, and rewrites a leaked secret" width="760">
</p>

A [Model Context Protocol](https://modelcontextprotocol.io) server for
[`leakferret`](https://github.com/leakferrethq/leakferret). The pitch: agents
hardcode secrets too, and nobody reviews their diffs line by line the way they
review a human pull request. This gives the agent tools to self-check — scan,
classify, verify against the provider, and rewrite — so a live key never makes
it into the commit. Works with Claude Code, Cursor, Continue, and Claude Desktop.

Listed in the official MCP Registry as **`io.github.leakferrethq/leakferret`**,
so registry-aware clients can discover it.

## Install and run

```bash
npm install @leakferret/mcp     # pulls in @leakferret/cli + the native binary
npx @leakferret/mcp             # JSON-RPC 2.0 over stdio
```

Running it in a terminal looks like a hang — that's correct. It's a stdio
JSON-RPC server waiting for an editor or agent to connect.

## Hook it up

**Claude Code** — one line:

```bash
claude mcp add leakferret -- npx -y @leakferret/mcp
```

**Any MCP client** (Cursor, Continue, Claude Desktop) — add to `.mcp.json` /
`claude_desktop_config.json`:

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

Cursor: Settings → MCP Servers → add command `npx @leakferret/mcp`.

## Tools and prompt exposed

| Tool | Purpose |
|---|---|
| `scan_repository` | Walk a path, return regex pre-filter candidates |
| `classify_candidates` | Apply offline heuristic `REAL`/`FIXTURE`/`UNKNOWN` verdicts |
| `verify_finding` | Live HTTP verification against the provider |
| `propose_rewrite` | Propose an env-var replacement for a real finding |
| `baseline_diff` | Diff a scan against the repo baseline |

Plus a `classify` **prompt** — the system prompt the host model uses to classify
candidates inline using the model the agent already has, with no extra API key.

## What leakferret does

Finds hardcoded secrets and API keys and confirms which are **live**: it
regex-scans files (respecting `.gitignore`), marks documented public examples as
`FIXTURE` via a signed catalog, classifies each candidate, and **verifies** real
findings with a harmless API call to the provider (AWS SigV4, GitHub, GitLab,
Stripe, OpenAI, Anthropic, Slack, Twilio, SendGrid, Mailgun, Datadog, Heroku,
npm, PyPI, DigitalOcean), with a trufflehog fallback.

**Privacy invariant:** the full secret value never leaves your machine. Only a
redacted first-4-plus-last-4 preview (e.g. `AKIA...4XYZ`) is ever written to a
report, log, network message, or model prompt. Verification calls go straight
from your machine to the provider — leakferret has no servers.

## Also a CLI

The same engine is a CLI: [`@leakferret/cli`](https://www.npmjs.com/package/@leakferret/cli)
(`npx @leakferret/cli scan .`), plus a GitHub Action and a VS Code extension.

## License

MIT for this package and the bundled binary. The fixture catalog **data** is
CC-BY-SA-4.0 — see [`leakferret-catalog`](https://github.com/leakferrethq/leakferret-catalog).

---

Part of [leakferret](https://github.com/leakferrethq/leakferret) ·
[leakferret.com](https://leakferret.com) ·
maintained by Maria Khan.

# @leakferret/mcp

MCP (Model Context Protocol) server for [`leakferret`](https://github.com/leakferrethq/leakferret).
Stops AI agents from committing live secrets by giving them a JSON-RPC
interface to scan, classify, verify, and rewrite findings before
producing edits.

## Install

```bash
npm install @leakferret/mcp
```

Pulls in `@leakferret/cli` (which fetches the native binary).

## Run

```bash
npx @leakferret/mcp
```

Speaks JSON-RPC 2.0 over stdio per the
[MCP spec](https://spec.modelcontextprotocol.io).

## Hook into Claude Code

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

## Hook into Cursor

Settings → MCP Servers → add command `npx @leakferret/mcp`.

## Tools exposed

| Tool | Purpose |
|---|---|
| `scan_repository` | Walk a path, return regex-pre-filter candidates |
| `classify_candidates` | Apply offline heuristic verdicts |
| `propose_rewrite` | Propose `ENV.fetch` replacement for a real finding |
| `verify_finding` | Live HTTP verify against the provider |
| `baseline_diff` | Diff scan against repo baseline |

## Prompt exposed

| Prompt | Purpose |
|---|---|
| `classify` | System prompt the host LLM uses to classify candidates inline |

## License

MIT.

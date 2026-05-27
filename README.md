# leakferret-npm

npm monorepo for the JavaScript distribution of
[`leakferret`](https://github.com/leakferrethq/leakferret).

## Packages

| Package | Purpose |
|---|---|
| [`@leakferret/cli`](./packages/cli) | CLI + programmatic API. Bundles the native binary. |
| [`@leakferret/mcp`](./packages/mcp) | MCP server for Claude Code / Cursor / Continue. Depends on `@leakferret/cli`. |

## Distribution model

Same pattern as `esbuild`, `biome`, `@swc/core`: ship a tiny JS shim
+ a `postinstall.js` that downloads the right platform binary from
GitHub Releases into `vendor/`. The CLI shim and the library API
both shell out to the binary.

This keeps the install path simple (`npm install @leakferret/cli`),
fast (no JS runtime startup cost on hot paths), and consistent
across Linux / macOS / Windows.

## License

MIT.

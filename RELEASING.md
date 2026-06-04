# Releasing

The native binary ships inside per-platform packages (`@leakferret/cli-<plat>`)
that `@leakferret/cli` lists as `optionalDependencies`. There is no install-time
download. Publishing is manual (npm token), in this order so dependents resolve.

## 1. Bump versions

- `packages/cli/package.json` (`version` and each `optionalDependencies` entry)
- `packages/mcp/package.json` (`version` and the `@leakferret/cli` dependency)
- `server.json` (`version` and the package `version`)

Keep all four in lockstep. The native binary version is separate: it lives in
`scripts/build-platform-packages.js` (`BINARY_VERSION`) and only changes when the
core release changes.

## 2. Build the platform packages

```bash
node scripts/build-platform-packages.js
```

Downloads each pinned release binary, verifies its SHA256, and writes
ready-to-publish package dirs under `dist/`.

## 3. Publish, in order

Platform packages first (so `@leakferret/cli` can resolve them), then the cli,
then the mcp server:

```bash
for d in dist/*/; do ( cd "$d" && npm publish --access public ); done
( cd packages/cli && npm publish --access public )
( cd packages/mcp && npm publish --access public )
```

## 4. Refresh the MCP registry

Push a `registry-v<version>` tag; `.github/workflows/publish-mcp.yml` publishes
`server.json` via OIDC.

```bash
git tag registry-v0.2.0 && git push origin registry-v0.2.0
```

# @leakferret/cli

npm wrapper for the native [`leakferret`](https://github.com/leakferrethq/leakferret)
binary (Rust). One-line install, single static binary downloaded at
`npm install` time, same CLI as the upstream tool.

## Install

```bash
npm install -D @leakferret/cli
# or
pnpm add -D @leakferret/cli
# or one-off:
npx @leakferret/cli scan .
```

Postinstall downloads `leakferret-{version}-{triple}.tar.gz` from
GitHub Releases into `node_modules/@leakferret/cli/vendor/`.

Skip the download with `LEAKFERRET_SKIP_DOWNLOAD=1` and point
`LEAKFERRET_BIN` at a pre-positioned binary (useful in air-gapped CI).

## CLI

Same shape as the upstream Rust binary:

```bash
leakferret scan .
leakferret verify . --only-verified
leakferret rewrite . --apply --backend doppler
leakferret mcp                       # MCP server on stdio
leakferret baseline init
leakferret catalog info
```

## Library use

```js
const { scan, verify, rewrite } = require('@leakferret/cli');

const findings = verify('.', { mode: 'only-verified' });
for (const f of findings) {
  console.log(`${f.path}:${f.line} ${f.pattern} [${f.verdict}] ${f.match_redacted}`);
}
```

TypeScript types are bundled (`lib/index.d.ts`).

## License

MIT.

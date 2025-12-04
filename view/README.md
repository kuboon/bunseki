# View Directory

This directory contains the analytics dashboard frontend files.

## Files

- `index.html` - Dashboard HTML page
- `client.ts` - TypeScript source code for data visualization
- `client.bundle.js` - Bundled JavaScript (generated, not committed to git)

## Building

The client code needs to be bundled before use. Run:

```bash
deno task build-client
```

This uses the `deno bundle` CLI command to bundle `client.ts` into `client.bundle.js`.

## How it works

1. The HTML page at `/domains/:domain/view/` is served by Hono's `serveStatic` middleware
2. The bundled JavaScript loads and fetches data from `/domains/:domain/api/data`
3. Data is rendered as charts and tables client-side

## Using Deno Bundle

We use `deno bundle` CLI command instead of programmatic bundling:

```bash
deno bundle --output view/client.bundle.js view/client.ts
```

This is the modern, official way to bundle Deno code as of Deno 2.4+, which uses esbuild under the hood.

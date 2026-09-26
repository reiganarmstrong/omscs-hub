// Serve the real Hono application, replacing only external Clerk and D1 boundaries.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'omscs-browser-api-'));
const outfile = join(directory, 'api.mjs');
await build({
  entryPoints: [resolve('../api/src/index.ts')], outfile, bundle: true, platform: 'node', format: 'esm',
  plugins: [{ name: 'clerk-fixture', setup(builder) {
    builder.onResolve({ filter: /^@clerk\/backend$/ }, () => ({ path: resolve('tests/fixtures/clerk-backend.mjs') }));
  } }],
});
const { default: app } = await import(pathToFileURL(outfile).href);
const env = {
  CLERK_SECRET_KEY: 'browser-fixture', CORS_ORIGIN: 'http://127.0.0.1:3101',
  DB: { prepare: () => ({ bind() { return this; }, first: async () => ({ id: 'CS-6200' }), all: async () => ({ results: [] }) }) },
};
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const result = await app.request(`http://127.0.0.1:8799${request.url}`, {
    method: request.method, headers: request.headers,
    ...(body.length ? { body } : {}),
  }, env);
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(Buffer.from(await result.arrayBuffer()));
});
server.listen(8799, '127.0.0.1');
async function close() { server.close(); await rm(directory, { recursive: true, force: true }); process.exit(0); }
process.on('SIGTERM', close);
process.on('SIGINT', close);

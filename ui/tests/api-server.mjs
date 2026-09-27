// Serve the real Hono application, replacing only external Clerk and D1 boundaries.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'omscs-browser-api-'));
const outfile = join(directory, 'api.mjs');
await build({
  entryPoints: [resolve('../api/src/index.ts')], outfile, bundle: true, platform: 'node', format: 'esm',
  plugins: [{ name: 'clerk-fixture', setup(builder) {
    builder.onResolve({ filter: /^@clerk\/backend$/ }, () => ({ path: resolve('tests/fixtures/clerk-backend.mjs') }));
  } }],
});
const { default: app } = await import(pathToFileURL(outfile).href);
// Import saved source fixtures into SQLite, then exercise the real Hono SQL.
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/import-omscentral.ts', '--data-dir', resolve('../api/tests/fixtures/omscentral'), '--sql-out', join(directory, 'import.sql'), '--historical-out', resolve('tests/fixtures/historical-courses.json')], { cwd: resolve('../api') });
const sqlite = new DatabaseSync(':memory:');
const migrationsDir = resolve('../api/migrations');
for (const migration of (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()) {
  sqlite.exec(await readFile(resolve(migrationsDir, migration), 'utf8'));
}
sqlite.exec(await readFile(join(directory, 'import.sql'), 'utf8'));
const env = {
  CLERK_SECRET_KEY: 'browser-fixture', CORS_ORIGIN: 'http://127.0.0.1:3101',
  OPERATOR_CLERK_USER_ID: 'user_moderation-operator',
  DB: { async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }, prepare(sql) {
    let params = [];
    return { bind(...values) { params = values; return this; },
      first: async () => sqlite.prepare(sql).get(...params) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
      run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...params).changes } }),
    };
  } },
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

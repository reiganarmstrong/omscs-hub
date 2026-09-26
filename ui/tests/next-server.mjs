// Keep Next's generated test types and config changes separate from normal builds.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

await writeFile('.tsconfig-browser-tests.json', await readFile('tsconfig.json'));
const child = spawn('pnpm', ['--config.verify-deps-before-run=false', 'exec', 'next', 'dev', '--webpack', '--port', '3101', '--hostname', '127.0.0.1'], { stdio: 'inherit', env: process.env });
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
child.on('exit', (code) => process.exit(code ?? 0));

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { brotliCompressSync, constants } from 'node:zlib';

const root = process.cwd();
const files = [];
async function collect(relative, destination = relative) {
  const info = await fs.lstat(path.join(root, relative));
  if (info.isSymbolicLink()) return;
  if (info.isDirectory()) {
    for (const item of (await fs.readdir(path.join(root, relative))).sort()) {
      if (['.git', '.bin', '.cache'].includes(item) || item === '.env' || item.startsWith('.env.')) continue;
      await collect(path.posix.join(relative, item), path.posix.join(destination, item));
    }
  } else if (info.isFile()) {
    if (/\.(ttf|otf|woff2?|ttc)$/i.test(relative)) return;
    const data = await fs.readFile(path.join(root, relative));
    files.push({ path: destination, data: data.toString('base64') });
  }
}
for (const directory of ['src', 'node_modules']) await collect('escape-room-backend/' + directory);
for (const file of ['edge-entry.mjs', 'package.json', 'scripts/migrate.js', 'scripts/seed-test.js']) await collect('escape-room-backend/' + file);
await collect('escape-room-backend/sql');
await collect('client/dist', 'escape-room-backend/public');
const payload = Buffer.from(JSON.stringify({ format: 'escape-room-runtime-v1', sourceCommit: process.env.GITHUB_SHA, files }));
const archive = brotliCompressSync(payload, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
const manifest = { sourceCommit: process.env.GITHUB_SHA, sha256: createHash('sha256').update(archive).digest('hex'), bytes: archive.length, unpackedBytes: payload.length, files: files.length };
await fs.mkdir('/tmp/escape-release', { recursive: true });
await fs.writeFile('/tmp/escape-release/runtime.json.br', archive);
await fs.writeFile('/tmp/escape-release/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('RUNTIME_MANIFEST', JSON.stringify(manifest));

// Deployment bootstrap for the dedicated Escape Room branch only.
// No database passwords, JWT signing keys, or demo passwords are shipped in source.
import fs from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import { createRequire } from 'node:module';
let ready;
async function boot() {
  if (process.env.NEON_BRANCH !== 'escape-room-live') throw Error('Wrong deployment branch');
  const uri = new URL(process.env.DATABASE_URL || '');
  if (!uri.hostname.startsWith('ep-hidden-cloud-av09vyjl')) throw Error('Wrong deployment endpoint');
  uri.pathname = '/escape_room';
  uri.hostname = uri.hostname.replace('-pooler.', '.');
  process.env.DATABASE_URL = uri.href;
  const response = await fetch(process.env.RUNTIME_URL, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw Error('Runtime download failed: ' + response.status);
  const archive = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(archive).digest('hex') !== process.env.RUNTIME_SHA256) throw Error('Runtime integrity check failed');
  const payload = JSON.parse(brotliDecompressSync(archive));
  if (payload.format !== 'escape-room-runtime-v1') throw Error('Invalid runtime format');
  const root = '/tmp/escape-runtime';
  for (const file of payload.files) {
    if (!file.path.startsWith('escape-room-backend/') || file.path.includes('..') || file.path.includes('\\')) throw Error('Invalid runtime path');
    const path = root + '/' + file.path;
    await fs.mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    await fs.writeFile(path, Buffer.from(file.data, 'base64'));
  }
  const require = createRequire(root + '/escape-room-backend/edge-entry.mjs');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: uri.href, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const db = (await pool.query('SELECT current_database() AS name')).rows[0].name;
    if (db !== 'escape_room') throw Error('Database isolation failed');
    await pool.query('CREATE SCHEMA IF NOT EXISTS escape_private');
    await pool.query('REVOKE ALL ON SCHEMA escape_private FROM PUBLIC');
    await pool.query('CREATE TABLE IF NOT EXISTS escape_private.runtime_config(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
    await pool.query('REVOKE ALL ON escape_private.runtime_config FROM PUBLIC');
    await pool.query('ALTER TABLE escape_private.runtime_config ENABLE ROW LEVEL SECURITY');
    const keys = ['JWT_SECRET', 'ADMIN_JWT_SECRET'];
    const settingsExists = (await pool.query("SELECT to_regclass('public.app_settings') AS present")).rows[0].present;
    const initialized = settingsExists && (await pool.query("SELECT 1 FROM app_settings WHERE key='demo_accounts_initialized'")).rowCount;
    if (!initialized) keys.push('TEST_MANAGER_PASSWORD', 'TEST_AGENT_PASSWORD', 'TEST_ACCOUNTANT_PASSWORD', 'TEST_CUSTOMER_PASSWORD');
    for (const key of keys) await pool.query('INSERT INTO escape_private.runtime_config(key,value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING', [key, 'Demo-' + randomBytes(32).toString('hex')]);
    const config = (await pool.query('SELECT key,value FROM escape_private.runtime_config')).rows;
    for (const { key, value } of config) process.env[key] = value;
    process.env.BOOTSTRAP_SCHEMA = '1';
    process.env.BOOTSTRAP_TEST_ACCOUNTS = initialized ? '0' : '1';
    process.env.NODE_ENV = 'production';
    process.env.PG_POOL_MAX = '4';
  } finally { await pool.end(); }
  return (await import(root + '/escape-room-backend/edge-entry.mjs')).default;
}
export default async function handler(request) {
  try {
    ready ??= boot().catch(error => { ready = null; throw error; });
    return await (await ready)(request);
  } catch (error) {
    console.error('ESCAPE_STARTUP', error.message);
    return Response.json({ success: false, message: 'Application is starting. Please retry shortly.' }, { status: 503, headers: { 'Retry-After': '10' } });
  }
}

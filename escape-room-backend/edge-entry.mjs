import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
let startup;

async function start() {
  process.env.NODE_ENV = 'production';
  // Never migrate the unrelated database that a hosting provider may inject by default.
  if (new URL(process.env.DATABASE_URL || '').pathname !== '/escape_room') {
    throw new Error('This deployment requires the dedicated escape_room database');
  }
  const root = path.dirname(fileURLToPath(import.meta.url));
  const { pool } = require('./src/config/db');
  const database = (await pool.query('SELECT current_database() AS name')).rows[0].name;
  if (database !== 'escape_room') throw new Error('Database isolation check failed');

  if (process.env.BOOTSTRAP_SCHEMA === '1') {
    await require('./scripts/migrate').migrate(pool);
  }
  if (process.env.BOOTSTRAP_TEST_ACCOUNTS === '1') {
    const lock = await pool.connect();
    try {
      await lock.query('SELECT pg_advisory_lock(84729002)');
      const done = await lock.query("SELECT value FROM app_settings WHERE key='demo_accounts_initialized'");
      if (!done.rowCount) {
        const password = process.env.TEST_CUSTOMER_PASSWORD;
        await require('./scripts/seed-test').seed(pool, password);
        const bcrypt = require('bcryptjs');
        for (const [username, variable] of [
          ['test-manager', 'TEST_MANAGER_PASSWORD'],
          ['test-agent', 'TEST_AGENT_PASSWORD'],
          ['test-accountant', 'TEST_ACCOUNTANT_PASSWORD'],
        ]) {
          const plain = process.env[variable];
          if (!plain || plain.length < 16 || Buffer.byteLength(plain) > 72) throw new Error('Missing strong test password');
          const hash = await bcrypt.hash(plain, 12);
          await lock.query('UPDATE staff_users SET password_hash=$1 WHERE username=$2', [hash, username]);
        }
        await lock.query("INSERT INTO app_settings(key,value) VALUES('demo_accounts_initialized','1') ON CONFLICT(key) DO NOTHING");
      }
    } finally {
      await lock.query('SELECT pg_advisory_unlock(84729002)').catch(() => {});
      lock.release();
    }
  }

  // Retrieve open-source rendering fonts directly from their publisher, not a public code artifact.
  const fonts = {
    'Amiri-Regular.ttf': 'ab391c4147d054c48976e98322ad0eefe1427aa0e0502a12a4c75d80a70cfcd7',
    'Amiri-Bold.ttf': 'cfccb794268e7d573d857e6d6a67f89cf8a053e8ffd85dfa0c8ec1bb36fc4827',
  };
  const directory = path.join(root, 'assets', 'fonts');
  await fs.mkdir(directory, { recursive: true });
  for (const [name, sha256] of Object.entries(fonts)) {
    const destination = path.join(directory, name);
    let bytes = await fs.readFile(destination).catch(() => null);
    if (!bytes || createHash('sha256').update(bytes).digest('hex') !== sha256) {
      const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/' + name, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Rendering font unavailable');
      bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error('Rendering font integrity check failed');
      await fs.writeFile(destination, bytes);
    }
  }
  const app = require('./src/app');
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  server.unref();
  return 'http://127.0.0.1:' + server.address().port;
}

export default async function handler(request) {
  if (!startup) startup = start().catch(error => { startup = undefined; throw error; });
  const origin = await startup;
  const incoming = new URL(request.url);
  const headers = new Headers(request.headers);
  // Do not trust client-supplied forwarding headers on the private loopback bridge.
  for (const key of ['host', 'connection', 'transfer-encoding', 'content-length', 'accept-encoding', 'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto']) headers.delete(key);
  const options = { method: request.method, headers, signal: request.signal, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') { options.body = request.body; options.duplex = 'half'; }
  return fetch(origin + incoming.pathname + incoming.search, options);
}

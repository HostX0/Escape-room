const { Pool } = require("pg");
const env = require("./env");
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || (process.env.VERCEL ? 2 : 10)),
  min: 0, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000,
  statement_timeout: 30000, allowExitOnIdle: true,
});
pool.on("error", error => console.error("[database] Pool error", error.code || "unknown"));
function dbCheck(cb) { pool.query("SELECT 1 AS ok, NOW() AS now", (error, result) => cb(error, result?.rows[0])); }
module.exports = { pool, dbCheck };

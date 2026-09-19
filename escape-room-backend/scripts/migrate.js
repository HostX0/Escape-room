#!/usr/bin/env node
require("dotenv").config();
const fs=require("fs"),path=require("path"),crypto=require("crypto"),{Pool}=require("pg");
async function migrate(pool) {
 const client=await pool.connect();
 try {
  await client.query("SELECT pg_advisory_lock(84729001)");
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const dir=path.join(__dirname,"..","sql");
  for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')&&!x.includes('seed_dev')).sort()) {
   const sql=fs.readFileSync(path.join(dir,name),'utf8'), hash=crypto.createHash('sha256').update(sql).digest('hex');
   const previous=(await client.query("SELECT checksum FROM schema_migrations WHERE name=$1",[name])).rows[0];
   if(previous) { if(previous.checksum!==hash) throw Error('Applied migration was changed: '+name);continue; }
   await client.query('BEGIN');
   try { await client.query(sql); await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,hash]); await client.query('COMMIT'); }
   catch(error) { await client.query('ROLLBACK');throw error; }
   console.log('[migrate] applied',name);
  }
 } finally { await client.query("SELECT pg_advisory_unlock(84729001)").catch(()=>{});client.release(); }
}
if(require.main===module) {
 if(!process.env.DATABASE_URL) {console.error('DATABASE_URL is required');process.exit(1);}
 const pool=new Pool({connectionString:process.env.DATABASE_URL});
 migrate(pool).catch(error=>{console.error('[migrate]',error.message);process.exitCode=1;}).finally(()=>pool.end());
}
module.exports={migrate};

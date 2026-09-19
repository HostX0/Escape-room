require('dotenv').config();
const {Pool}=require('pg'),bcrypt=require('bcryptjs');
async function seed(pool,password) {
 if(typeof password!=='string'||password.length<16||Buffer.byteLength(password)>72) throw Error('TEST_SEED_PASSWORD must be 16–72 bytes');
 const hash=await bcrypt.hash(password,12),client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query("DELETE FROM staff_users WHERE username=ANY($1::text[])",[['manager','agent','accountant']]);
  for(const [username,role] of [['test-manager','manager'],['test-agent','booking_agent'],['test-accountant','accountant']]) {
   await client.query(`INSERT INTO staff_users(full_name,username,password_hash,role,is_active) VALUES($1,$2,$3,$4,true)
    ON CONFLICT(username) DO UPDATE SET password_hash=$3,role=$4,is_active=true`,[username,username,hash,role]);
  }
  await client.query(`INSERT INTO users(full_name,phone,password_hash,is_phone_verified) VALUES('Test Customer','+9647700000001',$1,true)
    ON CONFLICT(phone) DO UPDATE SET password_hash=$1,is_phone_verified=true`,[hash]);
  await client.query("INSERT INTO themes(name,description,is_active) SELECT 'Demo Escape Room','Test experience — replace before launch',true WHERE NOT EXISTS(SELECT 1 FROM themes WHERE name='Demo Escape Room')");
  // Seed each room's next seven days once, without replacing an existing schedule.
  await client.query(`INSERT INTO room_theme_schedule(room_id,theme_id,start_at,end_at)
    SELECT r.id,t.id,d+'12 hours'::interval,d+'23 hours'::interval FROM rooms r CROSS JOIN themes t
    CROSS JOIN generate_series(date_trunc('day',NOW() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad',
      (date_trunc('day',NOW() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')+'6 days'::interval,'1 day') d
    WHERE t.name='Demo Escape Room' AND NOT EXISTS(SELECT 1 FROM room_theme_schedule s WHERE s.room_id=r.id AND s.start_at<d+'23 hours'::interval AND s.end_at>d+'12 hours'::interval)`);
  await client.query('COMMIT');
 } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}
if(require.main===module){
 if(process.env.TEST_DATABASE_CONFIRM!=='escape-room-test'){console.error('Set TEST_DATABASE_CONFIRM=escape-room-test only for the dedicated Escape Room test database');process.exit(1);}
 const pool=new Pool({connectionString:process.env.DATABASE_URL});
 seed(pool,process.env.TEST_SEED_PASSWORD).then(()=>console.log('Test accounts created; legacy staff accounts removed. Passwords were not printed.')).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
}
module.exports={seed};

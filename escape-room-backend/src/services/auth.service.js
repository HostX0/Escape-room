const { pool } = require('../config/db');
const env = require('../config/env');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { normalizePhone } = require('../utils/validators');
const { signUserToken } = require('../utils/jwt');
const { transaction, publicError, callback } = require('../utils/transaction');
const { sendWhatsAppOTP } = require('../utils/whatsapp');
const digest = code => crypto.createHmac('sha256', env.JWT_SECRET).update(code).digest('hex');

function register(payload, cb) {
  callback((async () => {
    if (!process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_TOKEN) throw publicError(503, 'Phone verification is temporarily unavailable. Please contact staff.');
    const phone = normalizePhone(payload.phone);
    const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_ROUNDS);
    const code = String(crypto.randomInt(100000, 1000000));
    const result = await transaction(async client => {
      // A failed delivery may be retried by the same unverified account, not used to overwrite another account.
      let user = (await client.query('SELECT * FROM users WHERE phone=$1 FOR UPDATE', [phone])).rows[0];
      if (user && (user.is_phone_verified || !await bcrypt.compare(payload.password, user.password_hash))) throw publicError(409, 'Phone already registered');
      if (!user) user = (await client.query('INSERT INTO users(full_name,phone,password_hash,is_phone_verified) VALUES($1,$2,$3,false) RETURNING *', [payload.full_name.trim(), phone, passwordHash])).rows[0];
      const recent = await client.query("SELECT COUNT(*)::int AS count, MAX(created_at) AS latest FROM phone_verification_codes WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'", [user.id]);
      if (recent.rows[0].count >= 5 || (recent.rows[0].latest && Date.now()-new Date(recent.rows[0].latest).getTime()<60000)) throw publicError(429, 'Please wait before requesting another verification code');
      await client.query('UPDATE phone_verification_codes SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
      const verification = (await client.query("INSERT INTO phone_verification_codes(user_id,code,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes') RETURNING id,expires_at", [user.id, digest(code)])).rows[0];
      return { user: { id:user.id, full_name:user.full_name, phone:user.phone, is_phone_verified:false }, verification };
    });
    const delivery = await sendWhatsAppOTP(phone, code);
    if (!delivery.success) {
      await pool.query('UPDATE phone_verification_codes SET used_at=NOW() WHERE id=$1', [result.verification.id]);
      throw publicError(503, 'Verification delivery failed. Please wait one minute and register again with the same password.');
    }
    return { user:result.user, verification:{expires_at:result.verification.expires_at} };
  })(), cb);
}

function verifyPhone(payload, cb) {
  callback((async () => {
    const code=String(payload.code||'').trim();
    if (!/^\d{6}$/.test(code)) throw publicError(400,'Enter the six-digit verification code');
    const outcome=await transaction(async client=>{
      const user=(await client.query('SELECT id,is_phone_verified FROM users WHERE phone=$1 FOR UPDATE',[normalizePhone(payload.phone)])).rows[0];
      if(!user) throw publicError(400,'Verification code is invalid or expired');
      if(user.is_phone_verified) return {verified:true,message:'Phone already verified'};
      const latest=(await client.query('SELECT id,code,attempts FROM phone_verification_codes WHERE user_id=$1 AND used_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE',[user.id])).rows[0];
      if(!latest||latest.attempts>=5) throw publicError(400,'Verification code is invalid or expired');
      const expected=Buffer.from(latest.code),supplied=Buffer.from(digest(code));
      if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied)) {
        await client.query('UPDATE phone_verification_codes SET attempts=attempts+1,used_at=CASE WHEN attempts+1>=5 THEN NOW() ELSE used_at END WHERE id=$1',[latest.id]);
        // Commit the failed-attempt counter before returning the public validation error.
        return {invalid:true};
      }
      await client.query('UPDATE phone_verification_codes SET used_at=NOW() WHERE id=$1',[latest.id]);
      await client.query('UPDATE users SET is_phone_verified=true WHERE id=$1',[user.id]);
      return {verified:true,message:'Phone verified successfully'};
    });
    if(outcome.invalid) throw publicError(400,'Verification code is invalid or expired');
    return outcome;
  })(),cb);
}

function login(payload, cb) {
  callback((async()=>{
    const user=(await pool.query('SELECT id,full_name,phone,password_hash,is_phone_verified FROM users WHERE phone=$1 LIMIT 1',[normalizePhone(payload.phone)])).rows[0];
    if(!user||!await bcrypt.compare(payload.password,user.password_hash)) throw publicError(401,'Invalid credentials');
    if(!user.is_phone_verified) throw publicError(403,'Phone must be verified before login');
    return {token:signUserToken({user_id:user.id}),user:{id:user.id,full_name:user.full_name,phone:user.phone,is_phone_verified:true}};
  })(),cb);
}

function updateProfile(userId,payload,cb) {
  callback((async()=>{
    const user=(await pool.query('UPDATE users SET full_name=$1 WHERE id=$2 AND phone=$3 RETURNING id,full_name,phone,is_phone_verified',[payload.full_name.trim(),userId,normalizePhone(payload.phone)])).rows[0];
    if(!user) throw publicError(409,'Changing a verified phone requires a new verification flow. Contact staff.');
    return {user};
  })(),cb);
}
module.exports={register,verifyPhone,login,updateProfile};

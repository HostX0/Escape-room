const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
// Requires a disposable PostgreSQL database. It is intentionally skipped without opt-in.
test('PostgreSQL end-to-end booking and authentication checks',{skip:process.env.RUN_DB_TESTS!=='1'},async t=>{
 process.env.JWT_SECRET||=crypto.randomBytes(48).toString('hex');process.env.ADMIN_JWT_SECRET||=crypto.randomBytes(48).toString('hex');
 const {pool}=require('../src/config/db');
 const {migrate}=require('../scripts/migrate'),{seed}=require('../scripts/seed-test');
 await migrate(pool);await migrate(pool);
 const password=crypto.randomBytes(24).toString('hex');await seed(pool,password);
 const invoke=(fn,...args)=>new Promise((resolve,reject)=>fn(...args,(error,data)=>error?reject(error):resolve(data)));
 const auth=require('../src/services/auth.service'),admin=require('../src/services/admin.service'),booking=require('../src/services/bookings.service'),payments=require('../src/services/payments.service');
 const staff=await invoke(admin.login,{username:'test-manager',password});
 const customer=await invoke(auth.login,{phone:'+9647700000001',password});
 await t.test('test credentials authenticate',()=>{assert.equal(staff.staff.role,'manager');assert.ok(customer.token)});
 await t.test('legacy accounts do not exist',async()=>assert.equal((await pool.query("SELECT id FROM staff_users WHERE username IN ('manager','agent','accountant')")).rowCount,0));
 const theme=(await pool.query("SELECT id FROM themes WHERE name='Demo Escape Room'")).rows[0];
 const slot=(await pool.query("SELECT s.start_at,s.room_id,r.branch_id FROM room_theme_schedule s JOIN rooms r ON r.id=s.room_id WHERE s.theme_id=$1 AND s.start_at>NOW()+INTERVAL '2 days' ORDER BY s.start_at,r.id LIMIT 1",[theme.id])).rows[0];
 const participant={full_name:'Test Customer',phone:'+9647700000001',is_primary:true};
 const payload={user_id:customer.user.id,room_id:slot.room_id,branch_id:slot.branch_id,start_at:slot.start_at.toISOString(),participants:[participant]};
 let result=await invoke(booking.createBooking,payload);
 await t.test('price is computed from participant count',()=>assert.equal(result.booking.fixed_price_iqd,35000));
 await t.test('duplicate overlapping booking rejected',async()=>assert.rejects(invoke(booking.createBooking,payload),error=>error.status===409));
 await t.test('customer cannot edit another customer booking',async()=>assert.rejects(invoke(booking.addParticipants,{booking_id:result.booking.id,user_id:999999,participants:[{full_name:'Other',phone:'+9647700000002',is_primary:false}]}),error=>error.status===404));
 await t.test('participant additions update booking and payment atomically',async()=>{
  await invoke(booking.addParticipants,{booking_id:result.booking.id,user_id:customer.user.id,participants:[{full_name:'Companion',phone:'+9647700000002',is_primary:false}]});
  const row=(await pool.query("SELECT b.fixed_price_iqd,p.amount_iqd FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE b.id=$1",[result.booking.id])).rows[0];assert.equal(row.fixed_price_iqd,70000);assert.equal(row.amount_iqd,70000);
 });
 await t.test('cancelled booking no longer blocks its slot',async()=>{
  await pool.query("UPDATE bookings SET status='cancelled' WHERE id=$1",[result.booking.id]);result=await invoke(booking.createBooking,payload);assert.ok(result.booking.id);
 });
 await t.test('unconfirmed booking cannot be paid',async()=>assert.rejects(invoke(payments.markPaid,{booking_id:result.booking.id,staff_id:staff.staff.id}),error=>error.status===409));
 await invoke(booking.confirmBooking,{booking_id:result.booking.id,user_id:customer.user.id});
 await t.test('payment and repeat payment behavior',async()=>{const paid=await invoke(payments.markPaid,{booking_id:result.booking.id,staff_id:staff.staff.id,method:'cash'});assert.equal(paid.status,'paid');await assert.rejects(invoke(payments.markPaid,{booking_id:result.booking.id,staff_id:staff.staff.id}),error=>error.status===409);});
 await t.test('paid cancellation requires staff',async()=>assert.rejects(invoke(booking.cancelMyBooking,{booking_id:result.booking.id,user_id:customer.user.id}),error=>error.status===409));
 await t.test('paid group size cannot be changed by customer',async()=>assert.rejects(invoke(booking.addParticipants,{booking_id:result.booking.id,user_id:customer.user.id,participants:[{full_name:'Extra',phone:'+9647700000003',is_primary:false}]}),error=>error.status===409));
 await t.test('waiver data stored in PostgreSQL, not a serverless file path',async()=>{
  const service=require('../src/services/waivers.service');const waivers=await invoke(service.generateForBooking,{booking_id:result.booking.id,staff_id:staff.staff.id});assert.equal(waivers.generated.length,1);
  const bytes=await invoke(service.getWaiverFile,waivers.generated[0].id);assert.equal(bytes.subarray(0,4).toString(),'%PDF');
  const repeated=await invoke(service.generateForBooking,{booking_id:result.booking.id});assert.equal(repeated.generated.length,0);assert.equal(repeated.skipped.length,1);
 });
 await pool.end();
});

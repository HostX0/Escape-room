// One-shot checks for the dedicated DEMO deployment; never enabled by default.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
async function run(origin, pool) {
  if (new URL(process.env.DATABASE_URL).pathname !== '/escape_room') throw Error('Demo database required');
  const lock = await pool.connect();
  const key = 'deployment_checks:' + process.env.RUNTIME_SHA256;
  const report = { checkedAt: new Date().toISOString(), checks: [] };
  const marker = 'Deployment self-test ' + crypto.randomUUID();
  const bookingIds = [], paymentIds = [];
  let themeId, assetId;
  async function check(name, fn) {
    try { await fn(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.message }); throw error; }
  }
  async function request(path, method = 'GET', body, token, expected = 200) {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(origin + '/api/v1' + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    let json; try { json = JSON.parse(bytes.toString()); } catch {}
    assert.equal(response.status, expected, path + ': ' + response.status + ' ' + (json?.message || ''));
    return { data: json?.data, bytes };
  }
  try {
    await lock.query('SELECT pg_advisory_lock(84729003)');
    if ((await lock.query('SELECT 1 FROM escape_private.runtime_config WHERE key=$1', [key])).rowCount) return;
    const secrets = Object.fromEntries((await lock.query("SELECT key,value FROM escape_private.runtime_config WHERE key LIKE 'TEST_%' AND value<>''")).rows.map(r => [r.key, r.value]));
    const staff = {};
    for (const [username, role, variable] of [['test-manager','manager','TEST_MANAGER_PASSWORD'],['test-agent','booking_agent','TEST_AGENT_PASSWORD'],['test-accountant','accountant','TEST_ACCOUNTANT_PASSWORD']]) {
      await check('HTTP login: ' + username, async () => {
        staff[role] = (await request('/admin/login','POST',{username,password:secrets[variable]})).data;
        assert.equal(staff[role].staff.role, role);
      });
    }
    let customer;
    await check('HTTP customer login accepts Iraqi local phone', async () => { customer=(await request('/auth/login','POST',{phone:'07700000001',password:secrets.TEST_CUSTOMER_PASSWORD})).data; assert.ok(customer.token); });
    const manager=staff.manager.token, agent=staff.booking_agent.token, accountant=staff.accountant.token;
    await check('Anonymous dashboard access denied', () => request('/admin/bookings','GET',null,null,401));
    await check('Customer token cannot access staff dashboard', () => request('/admin/bookings','GET',null,customer.token,401));
    await check('Agent cannot manage staff accounts', () => request('/admin/staff-users','GET',null,agent,403));
    await check('Accountant can list bookings', () => request('/admin/bookings','GET',null,accountant));
    await check('Legacy staff credentials removed', async () => { assert.equal((await pool.query("SELECT 1 FROM staff_users WHERE username IN ('manager','agent','accountant')")).rowCount,0); });
    for(const path of ['/admin/staff-users','/admin/branches','/admin/rooms','/admin/themes','/admin/contact-settings']) await check('Manager dashboard '+path,()=>request(path,'GET',null,manager));
    const slot=(await pool.query("SELECT s.start_at,s.room_id,r.branch_id FROM room_theme_schedule s JOIN rooms r ON r.id=s.room_id JOIN themes t ON t.id=s.theme_id WHERE t.name='Demo Escape Room' AND s.start_at>NOW()+INTERVAL '2 days' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.room_id=r.id AND b.start_at<s.start_at+INTERVAL '1 hour' AND b.end_at>s.start_at AND b.status NOT IN ('cancelled','no_show')) ORDER BY s.start_at,r.id LIMIT 1")).rows[0];
    assert.ok(slot,'Available demo slot required');
    const payload={room_id:slot.room_id,branch_id:slot.branch_id,start_at:slot.start_at.toISOString(),participants:[{full_name:'Deployment Test',phone:'+9647700000001',is_primary:true}],notes:marker};
    let booking;
    await check('Create persistent booking with server-calculated price',async()=>{booking=(await request('/bookings','POST',payload,customer.token,201)).data;bookingIds.push(booking.booking.id);paymentIds.push(booking.payment.id);assert.equal(booking.booking.fixed_price_iqd,35000);});
    const id=booking.booking.id;
    await check('Overlapping room booking rejected',()=>request('/bookings','POST',payload,customer.token,409));
    await check('Booking appears in customer history',async()=>{const list=(await request('/bookings/me/bookings','GET',null,customer.token)).data.bookings;assert.ok(list.some(b=>String(b.id)===String(id)));});
    await check('Adding a participant updates payment total',async()=>{await request('/bookings/'+id+'/participants','POST',{participants:[{full_name:'Deployment Companion',phone:'+9647700000002',is_primary:false}]},customer.token);const row=(await pool.query('SELECT b.fixed_price_iqd,p.amount_iqd FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE b.id=$1',[id])).rows[0];assert.equal(row.fixed_price_iqd,70000);assert.equal(row.amount_iqd,70000);});
    await check('Confirm booking',()=>request('/bookings/'+id+'/confirm','POST',{},customer.token));
    await check('Agent cannot mark payments paid',()=>request('/admin/payments/'+id+'/mark-paid','POST',{method:'cash'},agent,403));
    await check('Accountant records payment',async()=>{const paid=(await request('/admin/payments/'+id+'/mark-paid','POST',{method:'cash'},accountant)).data;assert.equal(paid.status,'paid');});
    await check('Duplicate payment rejected',()=>request('/admin/payments/'+id+'/mark-paid','POST',{method:'cash'},accountant,409));
    await check('Paid cancellation requires staff assistance',()=>request('/bookings/'+id+'/cancel','POST',{},customer.token,409));
    await check('Generate and retrieve private PDF waivers',async()=>{const result=(await request('/admin/bookings/'+id+'/generate-waivers','POST',{},manager)).data;assert.equal(result.generated.length,2);const wid=result.generated[0].id;await request('/admin/waivers/'+wid+'/download','GET',null,null,401);const pdf=await request('/admin/waivers/'+wid+'/download','GET',null,manager);assert.equal(pdf.bytes.subarray(0,4).toString(),'%PDF');});
    await check('Cancel an unpaid booking and reuse its slot',async()=>{const next={...payload,start_at:new Date(slot.start_at.getTime()+3600000).toISOString()};for(let i=0;i<2;i++){const result=(await request('/bookings','POST',next,customer.token,201)).data;bookingIds.push(result.booking.id);paymentIds.push(result.payment.id);await request('/bookings/'+result.booking.id+'/cancel','POST',{},customer.token);}});
    await check('Theme image upload persists and serves real image bytes',async()=>{const theme=(await request('/admin/themes','POST',{name:marker,description:'Temporary deployment check',is_active:false},manager,201)).data;themeId=theme.id;const form=new FormData();const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');form.append('image',new Blob([image],{type:'image/png'}),'test.png');const updated=(await request('/admin/themes/'+themeId+'/image','POST',form,manager)).data;assetId=updated.image_url.split('/').pop();const response=await fetch(origin+updated.image_url);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),image);});
    await check('Unconfigured phone verification is not falsely reported as sent',()=>request('/auth/register','POST',{full_name:'Deployment Only',phone:'+9647700000099',password:'TemporaryNotAnAccount123!'},null,503));
    report.passed=true;
  } catch(error) { report.passed=false; report.error=error.message; }
  finally {
    try {
      if(bookingIds.length){await pool.query("DELETE FROM audit_logs WHERE (entity_type='booking' AND entity_id=ANY($1::bigint[])) OR (entity_type='payment' AND entity_id=ANY($2::bigint[])) OR details->>'booking_id'=ANY($3::text[])",[bookingIds,paymentIds,bookingIds.map(String)]);await pool.query('DELETE FROM bookings WHERE id=ANY($1::bigint[]) AND notes=$2',[bookingIds,marker]);}
      if(themeId){await pool.query("DELETE FROM audit_logs WHERE entity_type='theme' AND entity_id=$1",[themeId]);await pool.query('DELETE FROM themes WHERE id=$1 AND name=$2',[themeId,marker]);}
      if(assetId)await pool.query('DELETE FROM app_assets WHERE id=$1',[assetId]);
      if(report.checks.length){await lock.query('INSERT INTO escape_private.runtime_config(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,JSON.stringify(report)]);console.log('DEPLOYMENT_CHECKS',JSON.stringify(report));}
    } finally { await lock.query('SELECT pg_advisory_unlock(84729003)').catch(()=>{});lock.release(); }
  }
}
module.exports={run};

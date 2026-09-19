const { transaction, publicError }=require("../utils/transaction");
const rules=require("../utils/bookingRules");
async function create(payload) {
  const people=rules.participants(payload.participants);const start=rules.futureStart(payload.start_at);
  if(payload.notes && (typeof payload.notes!=="string"||payload.notes.length>2000)) throw publicError(400,"Notes are too long");
  return transaction(async client=>{
    const settings=Object.fromEntries((await client.query("SELECT key,value FROM app_settings WHERE key IN ('booking_duration_min','price_per_person_iqd')")).rows.map(x=>[x.key,x.value]));
    const duration=Number(settings.booking_duration_min||60),unit=Number(settings.price_per_person_iqd||35000);
    if(!Number.isInteger(duration)||duration<15||duration>240||!Number.isInteger(unit)||unit<0||unit>10000000) throw publicError(503,"Invalid booking settings. Contact staff.");
    const end=new Date(Date.parse(start)+duration*60000).toISOString();
    const user=(await client.query("SELECT id FROM users WHERE id=$1 AND is_phone_verified=true",[payload.user_id])).rows[0];
    if(!user) throw publicError(403,"Verified customer account required");
    const room=(await client.query(`SELECT r.id,r.branch_id,b.name AS branch_name,s.theme_id,t.name AS theme_name,t.description
      FROM rooms r JOIN branches b ON b.id=r.branch_id JOIN room_theme_schedule s ON s.room_id=r.id JOIN themes t ON t.id=s.theme_id
      WHERE r.is_active AND b.is_active AND t.is_active AND s.start_at<=$1 AND s.end_at>=$2
      AND r.capacity_min<=$3 AND r.capacity_max>=$3
      AND ($4::bigint IS NULL OR s.theme_id=$4) AND ($5::bigint IS NULL OR r.id=$5)
      AND ($6::bigint IS NULL OR b.id=$6)
      AND NOT EXISTS(SELECT 1 FROM bookings bk WHERE bk.room_id=r.id AND bk.status NOT IN ('cancelled','no_show') AND bk.start_at<$2 AND bk.end_at>$1)
      ORDER BY r.id LIMIT 1 FOR UPDATE OF r SKIP LOCKED`,[start,end,people.length,payload.theme_id||null,payload.room_id||null,payload.branch_id||null])).rows[0];
    if(!room) throw publicError(409,"No available room for this time and group size");
    const amount=unit*people.length;
    const booking=(await client.query(`INSERT INTO bookings(user_id,branch_id,room_id,theme_id,start_at,end_at,fixed_price_iqd,unit_price_iqd,status,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9) RETURNING *`,[payload.user_id,room.branch_id,room.id,room.theme_id,start,end,amount,unit,payload.notes||null])).rows[0];
    const inserted=[];
    for(const p of people) inserted.push((await client.query("INSERT INTO booking_participants(booking_id,full_name,phone,is_primary) VALUES($1,$2,$3,$4) RETURNING *",[booking.id,p.full_name,p.phone,p.is_primary])).rows[0]);
    const payment=(await client.query("INSERT INTO payments(booking_id,amount_iqd,status,method) VALUES($1,$2,'unpaid','cash') RETURNING *",[booking.id,amount])).rows[0];
    return {booking,participants:inserted,payment,room};
  });
}
module.exports={create};

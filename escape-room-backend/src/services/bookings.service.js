const { pool } = require("../config/db");

function makePublicError(status, message) {
  var e = new Error(message);
  e.status = status;
  e.publicMessage = message;
  return e;
}

// CREATE BOOKING (Transaction)
function createBooking(payload, cb) {
  require("../utils/transaction").callback(require("./bookingEngine").create(payload).then(({booking,participants,payment})=>({booking,participants,payment})),cb);
}

function confirmBooking(payload, cb) {
  var sql = [
    "UPDATE bookings",
    "SET status='confirmed'",
    "WHERE id=$1 AND user_id=$2 AND status='pending' AND start_at>NOW()",
    "RETURNING id, status, start_at, end_at",
  ].join(" ");
  pool.query(sql, [payload.booking_id, payload.user_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) {
      return cb(makePublicError(404, "Booking not found or not pending"));
    }
    return cb(null, result.rows[0]);
  });
}

function addParticipants(payload, cb) {
  const {transaction,publicError,callback}=require("../utils/transaction");
  callback((async()=>{
    const people=require("../utils/bookingRules").participants(payload.participants,false);
    return transaction(async client=>{
      const booking=(await client.query("SELECT b.*,r.capacity_max FROM bookings b JOIN rooms r ON r.id=b.room_id WHERE b.id=$1 AND b.user_id=$2 FOR UPDATE OF b",[payload.booking_id,payload.user_id])).rows[0];
      if(!booking) throw publicError(404,"Booking not found");
      if(!['pending','confirmed'].includes(booking.status)||new Date(booking.start_at)<=new Date()) throw publicError(409,"This booking cannot be changed");
      const pay=(await client.query("SELECT * FROM payments WHERE booking_id=$1 FOR UPDATE",[booking.id])).rows[0];
      if(!pay||pay.status!=='unpaid') throw publicError(409,"Paid bookings require staff assistance");
      const count=Number((await client.query("SELECT COUNT(*) FROM booking_participants WHERE booking_id=$1",[booking.id])).rows[0].count);
      if(count+people.length>booking.capacity_max) throw publicError(400,"Room capacity exceeded");
      const inserted=[];
      for(const p of people) inserted.push((await client.query("INSERT INTO booking_participants(booking_id,full_name,phone,is_primary) VALUES($1,$2,$3,false) RETURNING *",[booking.id,p.full_name,p.phone])).rows[0]);
      const total=Number(booking.unit_price_iqd)*(count+people.length);
      await client.query("UPDATE bookings SET fixed_price_iqd=$1 WHERE id=$2",[total,booking.id]);
      await client.query("UPDATE payments SET amount_iqd=$1 WHERE booking_id=$2",[total,booking.id]);
      return inserted;
    });
  })(),cb);
}

function listMyBookings(payload, cb) {
  // عرض حجوزات المستخدم الحالي في صفحة البروفايل
  var sql = [
    "SELECT b.id, b.start_at, b.end_at, b.status, b.fixed_price_iqd,",
    "t.name AS theme_name, p.status AS payment_status, p.amount_iqd AS paid_amount_iqd",
    "FROM bookings b",
    "LEFT JOIN themes t ON t.id = b.theme_id",
    "LEFT JOIN payments p ON p.booking_id = b.id",
    "WHERE b.user_id=$1",
    "ORDER BY b.start_at DESC",
  ].join(" ");
  pool.query(sql, [payload.user_id], function (err, result) {
    if (err) return cb(err);
    return cb(null, { bookings: result.rows });
  });
}

function cancelMyBooking(payload, cb) {
  const {transaction,publicError,callback}=require("../utils/transaction");
  callback(transaction(async client=>{
    const b=(await client.query("SELECT * FROM bookings WHERE id=$1 AND user_id=$2 FOR UPDATE",[payload.booking_id,payload.user_id])).rows[0];
    if(!b) throw publicError(404,"Booking not found");
    if(!['pending','confirmed'].includes(b.status)||new Date(b.start_at).getTime()<=Date.now()+86400000) throw publicError(409,"Cancellation requires at least 24 hours notice");
    const payment=(await client.query("SELECT status FROM payments WHERE booking_id=$1 FOR UPDATE",[b.id])).rows[0];
    if(payment?.status==='paid') throw publicError(409,"Paid bookings require staff assistance for cancellation and refunds");
    return (await client.query("UPDATE bookings SET status='cancelled' WHERE id=$1 RETURNING id,status,start_at,end_at",[b.id])).rows[0];
  }),cb);
}

function listAvailability(payload, cb) {
  var roomId = Number(payload.room_id);
  var date = payload.date;
  var dayStart, dayEnd;
  try { [dayStart, dayEnd] = require("../utils/bookingRules").dateBounds(date); } catch(error) { return cb(error); }

  var sql = [
    "SELECT id, room_id, branch_id, theme_id, start_at, end_at, status",
    "FROM bookings",
    "WHERE room_id=$1",
    "AND start_at < $3",
    "AND end_at > $2",
    "AND status NOT IN ('cancelled','no_show')",
    "ORDER BY start_at ASC",
  ].join(" ");

  pool.query(sql, [roomId, dayStart.toISOString(), dayEnd.toISOString()], function (err, result) {
    if (err) return cb(err);
    return cb(null, {
      room_id: roomId,
      date: date,
      bookings: result.rows,
    });
  });
}

module.exports = {
  createBooking,
  confirmBooking,
  addParticipants,
  listAvailability,
  listMyBookings,
  cancelMyBooking,
};

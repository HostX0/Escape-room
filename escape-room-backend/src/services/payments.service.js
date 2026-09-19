const { pool } = require("../config/db");
const { insertAuditLog } = require("../utils/auditLog");
const { mapPgError } = require("../utils/pgError");

function makePublicError(status, message) {
  var e = new Error(message);
  e.status = status;
  e.publicMessage = message;
  return e;
}

// الدفع عند الوصول فقط: تحديث سجل الدفع من unpaid إلى paid
function markPaid(payload, cb) {
  const {transaction,publicError,callback}=require("../utils/transaction");
  callback(transaction(async client=>{
    const booking=(await client.query("SELECT id,status FROM bookings WHERE id=$1 FOR UPDATE",[payload.booking_id])).rows[0];
    if(!booking||!['confirmed','arrived','completed'].includes(booking.status)) throw publicError(409,"Payment requires an active confirmed booking");
    const payment=(await client.query("UPDATE payments SET status='paid',method=$2,received_by=$3,received_at=NOW(),reference_no=$4 WHERE booking_id=$1 AND status='unpaid' RETURNING *",[payload.booking_id,payload.method||'cash',payload.staff_id,payload.reference_no||null])).rows[0];
    if(!payment) throw publicError(409,"Payment already recorded or unavailable");
    await client.query("INSERT INTO audit_logs(staff_id,action,entity_type,entity_id,details) VALUES($1,'mark_paid','payment',$2,$3::jsonb)",[payload.staff_id,payment.id,JSON.stringify({booking_id:payment.booking_id,amount_iqd:payment.amount_iqd,method:payment.method})]);
    return payment;
  }),cb);
}

function getReceipt(payload, cb) {
  var bookingSql = [
    "SELECT b.id, b.user_id, b.branch_id, b.room_id, b.theme_id, b.start_at, b.end_at, b.fixed_price_iqd, b.status, b.notes, b.created_at",
    "FROM bookings b",
    "WHERE b.id=$1 LIMIT 1",
  ].join(" ");
  pool.query(bookingSql, [payload.booking_id], function (bookErr, bookResult) {
    if (bookErr) return cb(bookErr);
    if (bookResult.rows.length === 0) return cb(makePublicError(404, "Booking not found"));
    var booking = bookResult.rows[0];

    var participantsSql = [
      "SELECT id, booking_id, full_name, phone, is_primary, created_at",
      "FROM booking_participants WHERE booking_id=$1 ORDER BY id ASC",
    ].join(" ");
    pool.query(participantsSql, [payload.booking_id], function (partErr, partResult) {
      if (partErr) return cb(partErr);

      var paymentSql = [
        "SELECT id, booking_id, amount_iqd, method, status, received_by, received_at, reference_no, created_at",
        "FROM payments WHERE booking_id=$1 LIMIT 1",
      ].join(" ");
      pool.query(paymentSql, [payload.booking_id], function (payErr, payResult) {
        if (payErr) return cb(payErr);
        if (payResult.rows.length === 0) return cb(makePublicError(404, "Payment record not found"));

        return cb(null, {
          booking: booking,
          participants: partResult.rows,
          payment: payResult.rows[0],
          summary: {
            participants_count: partResult.rows.length,
            amount_iqd: payResult.rows[0].amount_iqd,
            payment_status: payResult.rows[0].status,
            payment_method: payResult.rows[0].method,
          },
        });
      });
    });
  });
}

module.exports = {
  markPaid,
  getReceipt,
};

const { pool } = require("../config/db");

function insertAuditLog(payload, cb) {
  var sql = [
    "INSERT INTO audit_logs(staff_id, action, entity_type, entity_id, details)",
    "VALUES($1,$2,$3,$4,$5::jsonb)",
    "RETURNING id, staff_id, action, entity_type, entity_id, details, created_at",
  ].join(" ");
  pool.query(
    sql,
    [
      payload.staff_id || null,
      payload.action,
      payload.entity_type,
      payload.entity_id || null,
      JSON.stringify(payload.details || {}),
    ],
    function (err, result) {
      if (err) return cb(err);
      return cb(null, result.rows[0]);
    },
  );
}

module.exports = { insertAuditLog };

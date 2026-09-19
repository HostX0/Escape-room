const { verifyAdminToken } = require("../utils/jwt");
const { pool } = require("../config/db");

function adminAuthMiddleware(req, res, next) {
  var auth = req.header("Authorization") || "";
  var token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing admin token" });
  }

  try {
    var payload = verifyAdminToken(token);
    if (!payload || !payload.staff_id || !payload.role) {
      return res.status(401).json({ success: false, message: "Invalid admin token payload" });
    }

    // Verify staff is still active in database
    pool.query(
      "SELECT is_active, role, branch_id FROM staff_users WHERE id=$1 LIMIT 1",
      [payload.staff_id],
      function (err, result) {
        if (err) return res.status(500).json({ success: false, message: "Internal error" });
        if (result.rows.length === 0 || !result.rows[0].is_active) {
          return res.status(401).json({ success: false, message: "Account deactivated" });
        }
        req.staff = {
          staff_id: payload.staff_id,
          role: result.rows[0].role,
          branch_id: result.rows[0].branch_id || null,
        };
        return next();
      }
    );
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
  }
}

module.exports = adminAuthMiddleware;

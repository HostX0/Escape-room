const { verifyUserToken } = require("../utils/jwt");
const { pool } = require("../config/db");

function authMiddleware(req, res, next) {
  var auth = req.header("Authorization") || "";
  var token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  try {
    var payload = verifyUserToken(token);
    if (!payload || !payload.user_id) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    // Verify user still exists in database
    pool.query(
      "SELECT id FROM users WHERE is_phone_verified=true AND id=$1 LIMIT 1",
      [payload.user_id],
      function (err, result) {
        if (err) return res.status(500).json({ success: false, message: "Internal error" });
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, message: "Account not found" });
        }
        req.user = { user_id: payload.user_id };
        return next();
      }
    );
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;

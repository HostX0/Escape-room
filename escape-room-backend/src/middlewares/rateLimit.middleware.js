const { createHash } = require("crypto");
const { pool } = require("../config/db");
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000, max = options.max || 60;
  const message = options.message || "Too many requests. Please try again later.";
  return async function rateLimiter(req, res, next) {
    try {
      const bucket = Math.floor(Date.now() / windowMs);
      const key = createHash("sha256").update(`${req.ip}|${req.baseUrl}|${req.route?.path || req.path}|${windowMs}|${max}|${bucket}`).digest("hex");
      const result = await pool.query(`INSERT INTO request_limits (key, hits, expires_at) VALUES ($1,1,$2)
        ON CONFLICT (key) DO UPDATE SET hits=request_limits.hits+1 RETURNING hits`,
        [key, new Date((bucket + 1) * windowMs)]);
      if (result.rows[0].hits > max) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((bucket+1)*windowMs-Date.now())/1000))));
        return res.status(429).json({success:false,message});
      }
      // Bounded best-effort cleanup; request limiting itself fails closed on DB failure.
      if (Math.random() < 0.02) await pool.query("DELETE FROM request_limits WHERE key IN (SELECT key FROM request_limits WHERE expires_at<NOW() LIMIT 500)");
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { createRateLimiter };

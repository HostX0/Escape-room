const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const authRoutes = require("./auth.routes");
const bookingsRoutes = require("./bookings.routes");
const roomsRoutes = require("./rooms.routes");
const publicRoutes = require("./public.routes");
const adminRoutes = require("./admin.routes");

// ── Health check (for load balancers / uptime monitors) ──
router.get("/health", function (_req, res) {
  pool.query("SELECT 1", function (err) {
    res.status(err ? 503 : 200).json({
      status: err ? "unhealthy" : "ok",
      timestamp: new Date().toISOString(),
      db: err ? "disconnected" : "connected",
      uptime: Math.floor(process.uptime()),
    });
  });
});

router.use("/auth", authRoutes);
router.use("/bookings", bookingsRoutes);
router.use("/rooms", roomsRoutes);
router.use("/public", publicRoutes);
router.use("/admin", adminRoutes);

module.exports = router;

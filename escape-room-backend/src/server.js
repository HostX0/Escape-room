const app = require("./app");
const env = require("./config/env");
const { pool, dbCheck } = require("./config/db");

// ── Unhandled rejection / exception safety net ────────
process.on("unhandledRejection", function (reason) {
  console.error("[FATAL] Unhandled Promise Rejection:", reason);
});
process.on("uncaughtException", function (err) {
  console.error("[FATAL] Uncaught Exception:", err);
  process.exit(1);
});

dbCheck(function (err, info) {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("Database connected. DB time:", info.now);

  var server = app.listen(env.PORT, function () {
    console.log("Server running on port %d (%s)", env.PORT, env.NODE_ENV);
  });

  // ── Graceful shutdown ───────────────────────────────
  function shutdown(signal) {
    console.log("\n%s received. Shutting down gracefully...", signal);
    server.close(function () {
      console.log("HTTP server closed.");
      pool.end(function () {
        console.log("DB pool closed.");
        process.exit(0);
      });
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(function () {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGTERM", function () { shutdown("SIGTERM"); });
  process.on("SIGINT", function () { shutdown("SIGINT"); });
});

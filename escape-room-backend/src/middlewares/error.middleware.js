function errorHandler(err, req, res, _next) {
  if (res.headersSent) return _next(err);
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : (err.status || 500);
  const message =
    status >= 500
      ? (err.publicMessage || "Internal Server Error")
      : err.code === "LIMIT_FILE_SIZE" ? "Image exceeds the 2 MB limit" : (err.publicMessage || "An error occurred");

  // Always log server errors
  if (status >= 500) {
    console.error("[%s] ERROR %s %s -> %d: %s", new Date().toISOString(), req.method, req.originalUrl, status, err.message);
    if (err.stack) console.error(err.stack);
  } else if (process.env.NODE_ENV !== "production") {
    console.error("[%s] WARN %s %s -> %d: %s", new Date().toISOString(), req.method, req.originalUrl, status, err.publicMessage || err.message);
  }

  return res.status(status).json({ success: false, message });
}

module.exports = errorHandler;

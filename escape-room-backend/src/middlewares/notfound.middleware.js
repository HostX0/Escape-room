function notFound(req, res, _next) {
  var payload = { success: false, message: "Route Not Found" };
  if (process.env.NODE_ENV !== "production") {
    payload.path = req.originalUrl;
  }
  return res.status(404).json(payload);
}

module.exports = notFound;

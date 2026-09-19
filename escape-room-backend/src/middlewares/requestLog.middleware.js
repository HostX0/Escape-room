function requestLogger(req, res, next) {
  var start = Date.now();
  var method = req.method;
  var url = req.originalUrl;

  res.on("finish", function () {
    var duration = Date.now() - start;
    var status = res.statusCode;
    var level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
    console.log(
      "[%s] %s %s %s %dms %s",
      new Date().toISOString(),
      level,
      method,
      url,
      duration,
      status
    );
  });

  return next();
}

module.exports = requestLogger;

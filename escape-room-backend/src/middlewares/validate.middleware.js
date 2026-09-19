function validate(opts) {
  opts = opts || {};
  return function (req, res, next) {
    if (typeof opts.body === "function") {
      const r = opts.body(req.body, req);
      if (r && r.ok === false) {
        return res.status(400).json({ success: false, message: r.message });
      }
    }
    if (typeof opts.params === "function") {
      const r = opts.params(req.params, req);
      if (r && r.ok === false) {
        return res.status(400).json({ success: false, message: r.message });
      }
    }
    if (typeof opts.query === "function") {
      const r = opts.query(req.query, req);
      if (r && r.ok === false) {
        return res.status(400).json({ success: false, message: r.message });
      }
    }
    return next();
  };
}

module.exports = validate;

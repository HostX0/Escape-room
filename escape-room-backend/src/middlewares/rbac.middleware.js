function requireRoles(roles) {
  return function (req, res, next) {
    if (!req.staff || !req.staff.role) {
      return res.status(401).json({ success: false, message: "Admin auth required" });
    }
    if (!roles.includes(req.staff.role)) {
      return res.status(403).json({ success: false, message: "Forbidden role" });
    }
    return next();
  };
}

module.exports = { requireRoles };

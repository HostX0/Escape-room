const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signUserToken(payload, options) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "24h",
    ...(options || {}),
  });
}

function verifyUserToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function signAdminToken(payload, options) {
  return jwt.sign(payload, env.ADMIN_JWT_SECRET, {
    expiresIn: "8h",
    ...(options || {}),
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, env.ADMIN_JWT_SECRET);
}

module.exports = {
  signUserToken,
  verifyUserToken,
  signAdminToken,
  verifyAdminToken,
};

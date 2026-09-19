const bcrypt = require("bcryptjs");
const env = require("../config/env");

function hashPassword(plain, cb) {
  bcrypt.hash(plain, env.BCRYPT_ROUNDS, function (err, hash) {
    if (err) return cb(err);
    return cb(null, hash);
  });
}

function comparePassword(plain, hash, cb) {
  bcrypt.compare(plain, hash, function (err, same) {
    if (err) return cb(err);
    return cb(null, same);
  });
}

module.exports = {
  hashPassword,
  comparePassword,
};

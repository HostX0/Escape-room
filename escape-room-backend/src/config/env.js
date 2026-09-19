require("dotenv").config();

function must(name) {
  var v = process.env[name];
  if (!v || String(v).trim() === "") {
    throw new Error("Missing required env var: " + name);
  }
  return v;
}

var port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number (1-65535), got: " + process.env.PORT);
}

var bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);
if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 16) {
  throw new Error("BCRYPT_ROUNDS must be between 10 and 16, got: " + process.env.BCRYPT_ROUNDS);
}

var env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: port,
  DATABASE_URL: must("DATABASE_URL"),
  JWT_SECRET: must("JWT_SECRET"),
  ADMIN_JWT_SECRET: must("ADMIN_JWT_SECRET"),
  BCRYPT_ROUNDS: bcryptRounds,
};

// Refuse unsafe production signing keys instead of logging and continuing.
if (env.NODE_ENV === "production") {
  if (env.JWT_SECRET.length < 48 || env.ADMIN_JWT_SECRET.length < 48 || env.JWT_SECRET === env.ADMIN_JWT_SECRET) {
    throw new Error("Use two different signing secrets, each at least 48 characters long.");
  }
}
module.exports = env;

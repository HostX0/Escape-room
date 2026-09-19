const express = require("express");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authController = require("../controllers/auth.controller");
const { createRateLimiter } = require("../middlewares/rateLimit.middleware");
const {
  isNotEmptyText,
  isValidPhone,
  isValidPassword,
} = require("../utils/validators");

const router = express.Router();

// General auth rate limiter: 10 requests per minute
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many attempts. Please try again later.",
});

// Stricter limiter for login: 5 requests per minute
const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
});

// Very strict limiter for phone verification: 3 requests per minute
const verifyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many verification attempts. Please wait before trying again.",
});

router.post(
  "/register",
  authLimiter,
  validate({
    body: function (b) {
      b = b || {};
      if (!isNotEmptyText(b.full_name, 120)) {
        return { ok: false, message: "full_name is required" };
      }
      if (!isValidPhone(b.phone)) return { ok: false, message: "Invalid phone format" };
      if (!isValidPassword(b.password)) {
        return { ok: false, message: "Password must be at least 8 characters with uppercase/number and lowercase" };
      }
      return { ok: true };
    },
  }),
  authController.register,
);

router.post(
  "/verify-phone",
  verifyLimiter,
  validate({
    body: function (b) {
      b = b || {};
      if (!isValidPhone(b.phone)) return { ok: false, message: "Invalid phone format" };
      if (!isNotEmptyText(String(b.code || ""), 10)) {
        return { ok: false, message: "code is required" };
      }
      return { ok: true };
    },
  }),
  authController.verifyPhone,
);

router.post(
  "/login",
  loginLimiter,
  validate({
    body: function (b) {
      b = b || {};
      if (!isValidPhone(b.phone)) return { ok: false, message: "Invalid phone format" };
      if (!isValidPassword(b.password)) {
        return { ok: false, message: "Password must be at least 8 characters with uppercase/number and lowercase" };
      }
      return { ok: true };
    },
  }),
  authController.login,
);

router.patch(
  "/profile",
  authMiddleware,
  validate({
    body: function (b) {
      b = b || {};
      if (!isNotEmptyText(b.full_name, 120)) {
        return { ok: false, message: "full_name is required" };
      }
      if (!isValidPhone(b.phone)) return { ok: false, message: "Invalid phone format" };
      return { ok: true };
    },
  }),
  authController.updateProfile,
);

module.exports = router;

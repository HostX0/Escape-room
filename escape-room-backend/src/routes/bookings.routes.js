const express = require("express");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const { createRateLimiter } = require("../middlewares/rateLimit.middleware");
const bookingsController = require("../controllers/bookings.controller");
const {
  toInt,
  isISODateTime,
  isNotEmptyText,
  isValidPhone,
} = require("../utils/validators");

const router = express.Router();

const bookingCreateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many booking requests. Please slow down.",
});

function validateBookingBody(body) {
  // theme-first mode
  if (toInt(body.theme_id)) {
    if (!isISODateTime(body.start_at)) return { ok: false, message: "start_at must be valid datetime" };
    if (!Array.isArray(body.participants) || body.participants.length === 0) {
      return { ok: false, message: "participants is required" };
    }
    if (body.participants.length < 1 || body.participants.length > 8) {
      return { ok: false, message: "participants count must be between 1 and 8" };
    }
    var primaryCountTheme = 0;
    for (var j = 0; j < body.participants.length; j += 1) {
      var pp = body.participants[j] || {};
      if (!isNotEmptyText(pp.full_name, 120)) return { ok: false, message: "participant full_name is required" };
      if (!isValidPhone(pp.phone)) return { ok: false, message: "participant phone is invalid" };
      if (pp.is_primary === true) primaryCountTheme += 1;
    }
    if (primaryCountTheme !== 1) return { ok: false, message: "Exactly one primary participant is required" };
    return { ok: true };
  }

  // legacy room-first mode
  if (!toInt(body.branch_id)) return { ok: false, message: "branch_id is required" };
  if (!toInt(body.room_id)) return { ok: false, message: "room_id is required" };
  if (!isISODateTime(body.start_at)) return { ok: false, message: "start_at must be valid datetime" };
  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    return { ok: false, message: "participants is required" };
  }
  if (body.participants.length < 1 || body.participants.length > 8) {
    return { ok: false, message: "participants count must be between 1 and 8" };
  }

  var primaryCount = 0;
  for (var i = 0; i < body.participants.length; i += 1) {
    var p = body.participants[i] || {};
    if (!isNotEmptyText(p.full_name, 120)) {
      return { ok: false, message: "participant full_name is required" };
    }
    if (!isValidPhone(p.phone)) return { ok: false, message: "participant phone is invalid" };
    if (p.is_primary === true) primaryCount += 1;
  }
  if (primaryCount !== 1) return { ok: false, message: "Exactly one primary participant is required" };
  return { ok: true };
}

function validateAddParticipantsBody(body) {
  if (body.participants?.length > 8) return {ok:false,message:"Too many participants"};
  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    return { ok: false, message: "participants is required" };
  }
  for (var i = 0; i < body.participants.length; i += 1) {
    var p = body.participants[i] || {};
    if (!isNotEmptyText(p.full_name, 120)) {
      return { ok: false, message: "participant full_name is required" };
    }
    if (!isValidPhone(p.phone)) return { ok: false, message: "participant phone is invalid" };
    if (p.is_primary === true) {
      return { ok: false, message: "Adding a new primary participant is not allowed" };
    }
  }
  return { ok: true };
}

function validateBookingId(params) {
  if (!toInt(params.id)) return { ok: false, message: "booking id is invalid" };
  return { ok: true };
}

function validateAvailabilityQuery(query) {
  if (!toInt(query.room_id) && !toInt(query.theme_id)) {
    return { ok: false, message: "room_id or theme_id is required" };
  }
  if (!query.date || Number.isNaN(new Date(query.date + "T00:00:00.000Z").getTime())) {
    return { ok: false, message: "date must be YYYY-MM-DD" };
  }
  return { ok: true };
}

router.post(
  "/",
  authMiddleware,
  bookingCreateLimiter,
  validate({ body: validateBookingBody }),
  bookingsController.createBooking,
);

router.post(
  "/:id/confirm",
  authMiddleware,
  validate({ params: validateBookingId }),
  bookingsController.confirmBooking,
);

router.post(
  "/:id/participants",
  authMiddleware,
  validate({ params: validateBookingId, body: validateAddParticipantsBody }),
  bookingsController.addParticipants,
);

router.get(
  "/me/bookings",
  authMiddleware,
  bookingsController.listMyBookings,
);

router.post(
  "/:id/cancel",
  authMiddleware,
  validate({ params: validateBookingId }),
  bookingsController.cancelMyBooking,
);

router.get(
  "/availability",
  validate({ query: validateAvailabilityQuery }),
  bookingsController.listAvailability,
);

module.exports = router;

const express = require("express");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const publicController = require("../controllers/public.controller");
const { toInt, isISODateTime, isNotEmptyText, isValidPhone } = require("../utils/validators");

const router = express.Router();

function validateThemeId(params) {
  if (!toInt(params.themeId)) return { ok: false, message: "themeId is invalid" };
  return { ok: true };
}

function validateAvailabilityQuery(query) {
  if (!query.date || Number.isNaN(new Date(query.date + "T00:00:00.000Z").getTime())) {
    return { ok: false, message: "date must be YYYY-MM-DD" };
  }
  return { ok: true };
}

function validateCreateBookingBody(body) {
  if (!toInt(body.theme_id)) return { ok: false, message: "theme_id is required" };
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
    if (!isNotEmptyText(p.full_name, 120)) return { ok: false, message: "participant full_name is required" };
    if (!isValidPhone(p.phone)) return { ok: false, message: "participant phone is invalid" };
    if (p.is_primary === true) primaryCount += 1;
  }
  if (primaryCount !== 1) return { ok: false, message: "Exactly one primary participant is required" };
  return { ok: true };
}

function validateBookingId(params) {
  if (!toInt(params.id)) return { ok: false, message: "booking id is invalid" };
  return { ok: true };
}

router.get("/themes", publicController.listThemes);

router.get(
  "/themes/:themeId/availability",
  validate({ params: validateThemeId, query: validateAvailabilityQuery }),
  publicController.listThemeAvailability,
);

router.post(
  "/bookings",
  authMiddleware,
  validate({ body: validateCreateBookingBody }),
  publicController.createBooking,
);

router.post(
  "/bookings/:id/confirm",
  authMiddleware,
  validate({ params: validateBookingId }),
  publicController.confirmBooking,
);

// Ratings
router.get(
  "/themes/:themeId/ratings",
  validate({ params: validateThemeId }),
  publicController.getThemeRatings,
);

router.get("/themes-ratings", publicController.getThemesRatingsSummary);

router.post(
  "/ratings",
  authMiddleware,
  validate({
    body: function (b) {
      if (!toInt(b.booking_id)) return { ok: false, message: "booking_id is required" };
      if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) return { ok: false, message: "rating must be 1-5" };
      return { ok: true };
    },
  }),
  publicController.submitRating,
);

// Contact info (public)
router.get("/contact-info", publicController.getContactInfo);

module.exports = router;

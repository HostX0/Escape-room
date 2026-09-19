const publicService = require("../services/public.service");
const { success } = require("../utils/response");

function listThemes(req, res, next) {
  publicService.listThemes(function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function listThemeAvailability(req, res, next) {
  var payload = {
    theme_id: req.params.themeId,
    date: req.query.date,
  };
  publicService.listThemeAvailability(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function listAvailability(req, res, next) {
  if (!req.query.theme_id) {
    var e1 = new Error("theme_id is required");
    e1.status = 400;
    e1.publicMessage = "theme_id is required";
    return next(e1);
  }
  if (!req.query.date || Number.isNaN(new Date(req.query.date + "T00:00:00.000Z").getTime())) {
    var e2 = new Error("date must be YYYY-MM-DD");
    e2.status = 400;
    e2.publicMessage = "date must be YYYY-MM-DD";
    return next(e2);
  }
  var payload = {
    theme_id: req.query.theme_id,
    date: req.query.date,
  };
  publicService.listThemeAvailability(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function createBooking(req, res, next) {
  var payload = {
    user_id: req.user.user_id,
    theme_id: req.body.theme_id,
    start_at: req.body.start_at,
    participants: req.body.participants,
    notes: req.body.notes || null,
  };
  publicService.createPublicBooking(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 201, data);
  });
}

function confirmBooking(req, res, next) {
  var payload = {
    booking_id: req.params.id,
    user_id: req.user.user_id,
  };
  publicService.confirmPublicBooking(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function getThemeRatings(req, res, next) {
  publicService.getThemeRatings(req.params.themeId, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function getThemesRatingsSummary(req, res, next) {
  publicService.getThemesWithRatings(function (err, data) {
    if (err) return next(err);
    return success(res, 200, { ratings: data });
  });
}

function submitRating(req, res, next) {
  var payload = {
    user_id: req.user.user_id,
    booking_id: req.body.booking_id,
    rating: req.body.rating,
    comment: req.body.comment || null,
  };
  publicService.submitRating(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 201, data);
  });
}

function getContactInfo(req, res, next) {
  publicService.getContactInfo(function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

module.exports = {
  listThemes,
  listThemeAvailability,
  listAvailability,
  createBooking,
  confirmBooking,
  getThemeRatings,
  getThemesRatingsSummary,
  submitRating,
  getContactInfo,
};

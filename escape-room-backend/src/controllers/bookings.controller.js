const bookingsService = require("../services/bookings.service");
const publicService = require("../services/public.service");
const { success } = require("../utils/response");

function createBooking(req, res, next) {
  // دعم حجز الثيم من مسار /bookings عند إرسال theme_id
  if (req.body.theme_id) {
    var publicPayload = {
      user_id: req.user.user_id,
      theme_id: req.body.theme_id,
      start_at: req.body.start_at,
      participants: req.body.participants,
      notes: req.body.notes || null,
    };
    return publicService.createPublicBooking(publicPayload, function (pErr, pData) {
      if (pErr) return next(pErr);
      return success(res, 201, pData);
    });
  }

  var payload = {
    user_id: req.user.user_id,
    branch_id: req.body.branch_id,
    room_id: req.body.room_id,
    start_at: req.body.start_at,
    participants: req.body.participants,
    notes: req.body.notes || null,
  };

  bookingsService.createBooking(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 201, data);
  });
}

function confirmBooking(req, res, next) {
  bookingsService.confirmBooking({ booking_id: req.params.id, user_id: req.user.user_id }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function addParticipants(req, res, next) {
  bookingsService.addParticipants(
    { booking_id: req.params.id, user_id: req.user.user_id, participants: req.body.participants },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function listAvailability(req, res, next) {
  // دعم availability للثيم من /availability?theme_id=&date=
  if (req.query.theme_id) {
    var pubPayload = {
      theme_id: req.query.theme_id,
      date: req.query.date,
    };
    return publicService.listThemeAvailability(pubPayload, function (pErr, pData) {
      if (pErr) return next(pErr);
      return success(res, 200, pData);
    });
  }

  var payload = {
    room_id: req.query.room_id,
    date: req.query.date,
  };
  bookingsService.listAvailability(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function listMyBookings(req, res, next) {
  bookingsService.listMyBookings({ user_id: req.user.user_id }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function cancelMyBooking(req, res, next) {
  bookingsService.cancelMyBooking(
    {
      booking_id: req.params.id,
      user_id: req.user.user_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

module.exports = {
  createBooking,
  confirmBooking,
  addParticipants,
  listAvailability,
  listMyBookings,
  cancelMyBooking,
};

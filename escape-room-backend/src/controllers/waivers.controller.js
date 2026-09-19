const waiversService = require("../services/waivers.service");
const { success } = require("../utils/response");

function generateForBooking(req, res, next) {
  var payload = {
    booking_id: req.params.id,
    staff_id: req.staff ? req.staff.staff_id : null,
  };
  waiversService.generateForBooking(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

module.exports = {
  generateForBooking,
};

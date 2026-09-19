const roomsService = require("../services/rooms.service");
const { success } = require("../utils/response");

function getAvailability(req, res, next) {
  var payload = {
    room_id: req.params.roomId,
    date: req.query.date,
  };
  roomsService.getRoomAvailability(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

module.exports = {
  getAvailability,
};

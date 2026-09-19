const express = require("express");
const validate = require("../middlewares/validate.middleware");
const roomsController = require("../controllers/rooms.controller");
const { toInt } = require("../utils/validators");

const router = express.Router();

router.get(
  "/:roomId/availability",
  validate({
    params: function (params) {
      if (!toInt(params.roomId)) return { ok: false, message: "roomId is invalid" };
      return { ok: true };
    },
    query: function (query) {
      if (!query.date || Number.isNaN(new Date(query.date + "T00:00:00.000Z").getTime())) {
        return { ok: false, message: "date must be YYYY-MM-DD" };
      }
      return { ok: true };
    },
  }),
  roomsController.getAvailability,
);

module.exports = router;

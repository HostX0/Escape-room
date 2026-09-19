const express = require("express");
const adminAuth = require("../middlewares/adminAuth.middleware");
const validate = require("../middlewares/validate.middleware");
const waiversController = require("../controllers/waivers.controller");
const { toInt } = require("../utils/validators");

const router = express.Router();

router.post(
  "/bookings/:id/generate",
  adminAuth,
  validate({
    params: function (params) {
      if (!toInt(params.id)) return { ok: false, message: "booking id is invalid" };
      return { ok: true };
    },
  }),
  waiversController.generateForBooking,
);

module.exports = router;

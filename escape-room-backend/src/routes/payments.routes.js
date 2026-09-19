const express = require("express");
const validate = require("../middlewares/validate.middleware");
const adminAuth = require("../middlewares/adminAuth.middleware");
const { requireRoles } = require("../middlewares/rbac.middleware");
const paymentsController = require("../controllers/payments.controller");
const { toInt, isNotEmptyText } = require("../utils/validators");

const router = express.Router();

function validateBookingId(params) {
  if (!toInt(params.id)) return { ok: false, message: "booking id is invalid" };
  return { ok: true };
}

function validateMarkPaidBody(body) {
  var method = body.method || "cash";
  if (!["cash", "pos", "other"].includes(method)) {
    return { ok: false, message: "method must be cash|pos|other" };
  }
  if (body.reference_no != null && !isNotEmptyText(String(body.reference_no), 60)) {
    return { ok: false, message: "reference_no is invalid" };
  }
  return { ok: true };
}

router.post(
  "/bookings/:id/mark-paid",
  adminAuth,
  requireRoles(["accountant", "manager"]),
  validate({ params: validateBookingId, body: validateMarkPaidBody }),
  paymentsController.markPaid,
);

router.get(
  "/bookings/:id/receipt",
  adminAuth,
  requireRoles(["booking_agent", "accountant", "manager"]),
  validate({ params: validateBookingId }),
  paymentsController.receipt,
);

module.exports = router;

const paymentsService = require("../services/payments.service");
const { success } = require("../utils/response");

function markPaid(req, res, next) {
  var payload = {
    booking_id: req.params.id,
    method: req.body.method || "cash",
    reference_no: req.body.reference_no || null,
    staff_id: req.staff.staff_id,
  };
  paymentsService.markPaid(payload, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function receipt(req, res, next) {
  paymentsService.getReceipt({ booking_id: req.params.id }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

module.exports = {
  markPaid,
  receipt,
};

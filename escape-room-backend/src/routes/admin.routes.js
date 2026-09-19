const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const validate = require("../middlewares/validate.middleware");
const adminAuth = require("../middlewares/adminAuth.middleware");
const { requireRoles } = require("../middlewares/rbac.middleware");
const { createRateLimiter } = require("../middlewares/rateLimit.middleware");
const adminController = require("../controllers/admin.controller");
const { isNotEmptyText, toInt, isISODateTime } = require("../utils/validators");

// Map mimetype to safe extension — never trust client-provided extension
var MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const themeImageStorage = multer.memoryStorage();
const themeImageUpload = multer({
  storage: themeImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    if (MIME_TO_EXT[file.mimetype]) return cb(null, true);
    var err = new Error("Only JPEG, PNG, WebP, GIF images are allowed");
    err.status = 400;
    err.publicMessage = err.message;
    cb(err);
  },
});

const router = express.Router();
const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many admin login attempts. Please try again later.",
});
const adminApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many admin requests. Please slow down.",
});

router.post(
  "/login",
  adminLoginLimiter,
  validate({
    body: function (b) {
      if (!isNotEmptyText(b.username, 60)) return { ok: false, message: "username is required" };
      if (!isNotEmptyText(b.password, 200)) return { ok: false, message: "password is required" };
      return { ok: true };
    },
  }),
  adminController.login,
);

router.use(adminApiLimiter);

function validateBookingId(params) {
  if (!toInt(params.id)) return { ok: false, message: "booking id is invalid" };
  return { ok: true };
}

function validateThemeScheduleId(params) {
  if (!toInt(params.id)) return { ok: false, message: "theme schedule id is invalid" };
  return { ok: true };
}

function validateThemeId(params) {
  if (!toInt(params.id)) return { ok: false, message: "theme id is invalid" };
  return { ok: true };
}

function validateBranchId(params) {
  if (!toInt(params.id)) return { ok: false, message: "branch id is invalid" };
  return { ok: true };
}

function validateRoomId(params) {
  if (!toInt(params.id)) return { ok: false, message: "room id is invalid" };
  return { ok: true };
}

function validateThemeBody(body) {
  if (!isNotEmptyText(body.name, 80)) return { ok: false, message: "name is required" };
  if (body.description != null && !isNotEmptyText(String(body.description), 1000)) {
    return { ok: false, message: "description is invalid" };
  }
  if (body.is_active != null && typeof body.is_active !== "boolean") {
    return { ok: false, message: "is_active must be boolean" };
  }
  return { ok: true };
}

function validateThemePatchBody(body) {
  if (body.name == null && body.description === undefined && body.is_active == null) {
    return { ok: false, message: "At least one field is required" };
  }
  if (body.name != null && !isNotEmptyText(body.name, 80)) return { ok: false, message: "name is invalid" };
  if (body.description !== undefined && body.description != null && !isNotEmptyText(String(body.description), 1000)) {
    return { ok: false, message: "description is invalid" };
  }
  if (body.is_active != null && typeof body.is_active !== "boolean") {
    return { ok: false, message: "is_active must be boolean" };
  }
  return { ok: true };
}

function validateBranchBody(body) {
  if (!isNotEmptyText(body.name, 80)) return { ok: false, message: "name is required" };
  if (body.address != null && !isNotEmptyText(String(body.address), 200)) return { ok: false, message: "address is invalid" };
  if (body.phone != null && !isNotEmptyText(String(body.phone), 30)) return { ok: false, message: "phone is invalid" };
  if (body.open_time != null && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(body.open_time))) {
    return { ok: false, message: "open_time must be HH:MM or HH:MM:SS" };
  }
  if (body.close_time != null && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(body.close_time))) {
    return { ok: false, message: "close_time must be HH:MM or HH:MM:SS" };
  }
  if (body.is_active != null && typeof body.is_active !== "boolean") return { ok: false, message: "is_active must be boolean" };
  return { ok: true };
}

function validateBranchPatchBody(body) {
  if (
    body.name == null &&
    body.address === undefined &&
    body.phone === undefined &&
    body.open_time === undefined &&
    body.close_time === undefined &&
    body.is_active == null
  ) {
    return { ok: false, message: "At least one field is required" };
  }
  if (body.name != null && !isNotEmptyText(body.name, 80)) return { ok: false, message: "name is invalid" };
  if (body.address !== undefined && body.address != null && !isNotEmptyText(String(body.address), 200)) {
    return { ok: false, message: "address is invalid" };
  }
  if (body.phone !== undefined && body.phone != null && !isNotEmptyText(String(body.phone), 30)) {
    return { ok: false, message: "phone is invalid" };
  }
  if (body.open_time !== undefined && body.open_time != null && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(body.open_time))) {
    return { ok: false, message: "open_time must be HH:MM or HH:MM:SS" };
  }
  if (body.close_time !== undefined && body.close_time != null && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(body.close_time))) {
    return { ok: false, message: "close_time must be HH:MM or HH:MM:SS" };
  }
  if (body.is_active != null && typeof body.is_active !== "boolean") return { ok: false, message: "is_active must be boolean" };
  return { ok: true };
}

function validateRoomBody(body) {
  if (!toInt(body.branch_id)) return { ok: false, message: "branch_id is required" };
  if (!isNotEmptyText(body.name, 80)) return { ok: false, message: "name is required" };
  if (body.capacity_min != null && (!Number.isInteger(Number(body.capacity_min)) || Number(body.capacity_min) < 1)) {
    return { ok: false, message: "capacity_min is invalid" };
  }
  if (body.capacity_max != null && (!Number.isInteger(Number(body.capacity_max)) || Number(body.capacity_max) < 1)) {
    return { ok: false, message: "capacity_max is invalid" };
  }
  if (body.capacity_min != null && body.capacity_max != null && Number(body.capacity_max) < Number(body.capacity_min)) {
    return { ok: false, message: "capacity_max must be greater than or equal to capacity_min" };
  }
  if (body.is_active != null && typeof body.is_active !== "boolean") return { ok: false, message: "is_active must be boolean" };
  return { ok: true };
}

function validateRoomPatchBody(body) {
  if (
    body.branch_id == null &&
    body.name == null &&
    body.capacity_min == null &&
    body.capacity_max == null &&
    body.is_active == null
  ) {
    return { ok: false, message: "At least one field is required" };
  }
  if (body.branch_id != null && !toInt(body.branch_id)) return { ok: false, message: "branch_id is invalid" };
  if (body.name != null && !isNotEmptyText(body.name, 80)) return { ok: false, message: "name is invalid" };
  if (body.capacity_min != null && (!Number.isInteger(Number(body.capacity_min)) || Number(body.capacity_min) < 1)) {
    return { ok: false, message: "capacity_min is invalid" };
  }
  if (body.capacity_max != null && (!Number.isInteger(Number(body.capacity_max)) || Number(body.capacity_max) < 1)) {
    return { ok: false, message: "capacity_max is invalid" };
  }
  if (body.capacity_min != null && body.capacity_max != null && Number(body.capacity_max) < Number(body.capacity_min)) {
    return { ok: false, message: "capacity_max must be greater than or equal to capacity_min" };
  }
  if (body.is_active != null && typeof body.is_active !== "boolean") return { ok: false, message: "is_active must be boolean" };
  return { ok: true };
}

function validateThemeScheduleBody(b) {
  if (!toInt(b.room_id)) return { ok: false, message: "room_id is required" };
  if (!toInt(b.theme_id)) return { ok: false, message: "theme_id is required" };
  if (!isISODateTime(b.start_at)) return { ok: false, message: "start_at must be valid datetime" };
  if (!isISODateTime(b.end_at)) return { ok: false, message: "end_at must be valid datetime" };
  if (new Date(b.end_at).getTime() <= new Date(b.start_at).getTime()) {
    return { ok: false, message: "end_at must be after start_at" };
  }
  return { ok: true };
}

function validateDateQuery(query) {
  if (!query.date || Number.isNaN(new Date(query.date + "T00:00:00.000Z").getTime())) {
    return { ok: false, message: "date must be YYYY-MM-DD" };
  }
  return { ok: true };
}

function validateBookingsListQuery(query) {
  if (query.date && Number.isNaN(new Date(query.date + "T00:00:00.000Z").getTime())) {
    return { ok: false, message: "date must be YYYY-MM-DD" };
  }
  if (query.status && !["pending", "confirmed", "cancelled", "arrived", "no_show", "completed"].includes(query.status)) {
    return { ok: false, message: "status is invalid" };
  }
  if (query.theme_id != null && !toInt(query.theme_id)) return { ok: false, message: "theme_id is invalid" };
  return { ok: true };
}

function validateRoomQuery(query) {
  if (query.branch_id != null && !toInt(query.branch_id)) {
    return { ok: false, message: "branch_id is invalid" };
  }
  return { ok: true };
}

function validateScheduleListQuery(query) {
  var base = validateDateQuery(query);
  if (!base.ok) return base;
  if (query.branch_id != null && !toInt(query.branch_id)) return { ok: false, message: "branch_id is invalid" };
  if (query.room_id != null && !toInt(query.room_id)) return { ok: false, message: "room_id is invalid" };
  if (query.theme_id != null && !toInt(query.theme_id)) return { ok: false, message: "theme_id is invalid" };
  return { ok: true };
}

function validateStaffId(params) {
  if (!toInt(params.id)) return { ok: false, message: "staff id is invalid" };
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

function validateCreateStaffBody(b) {
  if (!isNotEmptyText(b.full_name, 120)) return { ok: false, message: "full_name is required" };
  if (!isNotEmptyText(b.username, 60)) return { ok: false, message: "username is required" };
  if (!isNotEmptyText(b.password, 200) || String(b.password).length < 8) {
    return { ok: false, message: "password must be at least 8 characters" };
  }
  if (!["booking_agent", "accountant", "manager"].includes(b.role)) {
    return { ok: false, message: "role must be booking_agent|accountant|manager" };
  }
  if (b.branch_id != null && !toInt(b.branch_id)) return { ok: false, message: "branch_id is invalid" };
  return { ok: true };
}

function validateUpdateStaffBody(b) {
  if (
    b.full_name == null &&
    b.username == null &&
    b.password == null &&
    b.role == null &&
    b.branch_id === undefined &&
    b.is_active == null
  ) {
    return { ok: false, message: "At least one field is required" };
  }
  if (b.full_name != null && !isNotEmptyText(b.full_name, 120)) {
    return { ok: false, message: "full_name is invalid" };
  }
  if (b.username != null && !isNotEmptyText(b.username, 60)) {
    return { ok: false, message: "username is invalid" };
  }
  if (b.password != null && (!isNotEmptyText(String(b.password), 200) || String(b.password).length < 8)) {
    return { ok: false, message: "password must be at least 8 characters" };
  }
  if (b.role != null && !["booking_agent", "accountant", "manager"].includes(b.role)) {
    return { ok: false, message: "role must be booking_agent|accountant|manager" };
  }
  if (b.branch_id !== undefined && b.branch_id != null && !toInt(b.branch_id)) {
    return { ok: false, message: "branch_id is invalid" };
  }
  if (b.is_active != null && typeof b.is_active !== "boolean") {
    return { ok: false, message: "is_active must be boolean" };
  }
  return { ok: true };
}

router.get(
  "/themes",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  adminController.listThemes,
);

router.post(
  "/themes",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ body: validateThemeBody }),
  adminController.createTheme,
);

router.patch(
  "/themes/:id",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateThemeId, body: validateThemePatchBody }),
  adminController.updateTheme,
);

router.post(
  "/themes/:id/image",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateThemeId }),
  themeImageUpload.single("image"),
  adminController.uploadThemeImage,
);

router.get(
  "/branches",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  adminController.listBranches,
);

router.post(
  "/branches",
  adminAuth,
  requireRoles(["manager"]),
  validate({ body: validateBranchBody }),
  adminController.createBranch,
);

router.patch(
  "/branches/:id",
  adminAuth,
  requireRoles(["manager"]),
  validate({ params: validateBranchId, body: validateBranchPatchBody }),
  adminController.updateBranch,
);

router.post(
  "/theme-schedules",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ body: validateThemeScheduleBody }),
  adminController.createThemeSchedule,
);

router.patch(
  "/theme-schedules/:id",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateThemeScheduleId, body: validateThemeScheduleBody }),
  adminController.updateThemeSchedule,
);

router.put(
  "/theme-schedules/:id",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateThemeScheduleId, body: validateThemeScheduleBody }),
  adminController.updateThemeSchedule,
);

router.get(
  "/theme-schedules",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ query: validateScheduleListQuery }),
  adminController.listThemeSchedules,
);

router.get(
  "/rooms",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ query: validateRoomQuery }),
  adminController.listRooms,
);

router.post(
  "/rooms",
  adminAuth,
  requireRoles(["manager"]),
  validate({ body: validateRoomBody }),
  adminController.createRoom,
);

router.patch(
  "/rooms/:id",
  adminAuth,
  requireRoles(["manager"]),
  validate({ params: validateRoomId, body: validateRoomPatchBody }),
  adminController.updateRoom,
);

router.delete(
  "/theme-schedules/:id",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateThemeScheduleId }),
  adminController.deleteThemeSchedule,
);

// جميع الأدوار تحتاج عرض الحجوزات لأداء مهامها
router.get(
  "/bookings",
  adminAuth,
  requireRoles(["booking_agent", "accountant", "manager"]),
  validate({ query: validateBookingsListQuery }),
  adminController.listBookings,
);

router.get(
  "/bookings/:id",
  adminAuth,
  requireRoles(["booking_agent", "accountant", "manager"]),
  validate({ params: validateBookingId }),
  adminController.getBookingDetails,
);

router.post(
  "/bookings/:id/confirm",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateBookingId }),
  adminController.confirmBooking,
);

router.post(
  "/bookings/:id/arrive",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({
    params: validateBookingId,
  }),
  adminController.confirmArrival,
);

router.post(
  "/bookings/:id/complete",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateBookingId }),
  adminController.completeBooking,
);

router.post(
  "/bookings/:id/no-show",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateBookingId }),
  adminController.markNoShow,
);

router.post(
  "/bookings/:id/cancel",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateBookingId }),
  adminController.cancelBooking,
);

router.post(
  "/bookings/:id/generate-waivers",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateBookingId }),
  adminController.generateWaivers,
);

router.get(
  "/bookings/:id/waivers",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  validate({ params: validateBookingId }),
  adminController.listWaivers,
);

router.post(
  "/bookings/:bookingId/waivers/:waiverId/sign",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  express.json({ limit: "5mb" }),
  adminController.signWaiver,
);

router.get(
  "/waivers/:waiverId/download",
  adminAuth,
  requireRoles(["booking_agent", "manager"]),
  adminController.downloadWaiver,
);

router.post(
  "/payments/:bookingId/mark-paid",
  adminAuth,
  requireRoles(["accountant", "manager"]),
  validate({
    params: function (params) {
      if (!toInt(params.bookingId)) return { ok: false, message: "bookingId is invalid" };
      return { ok: true };
    },
    body: validateMarkPaidBody,
  }),
  adminController.markPaid,
);

router.get(
  "/reports/daily",
  adminAuth,
  requireRoles(["accountant", "manager"]),
  validate({ query: validateDateQuery }),
  adminController.dailyReport,
);

router.get(
  "/staff-users",
  adminAuth,
  requireRoles(["manager"]),
  adminController.listStaffUsers,
);

router.post(
  "/staff-users",
  adminAuth,
  requireRoles(["manager"]),
  validate({ body: validateCreateStaffBody }),
  adminController.createStaffUser,
);

router.patch(
  "/staff-users/:id",
  adminAuth,
  requireRoles(["manager"]),
  validate({ params: validateStaffId, body: validateUpdateStaffBody }),
  adminController.updateStaffUser,
);

router.get(
  "/contact-settings",
  adminAuth,
  requireRoles(["manager"]),
  adminController.getContactSettings,
);

router.put(
  "/contact-settings",
  adminAuth,
  requireRoles(["manager"]),
  adminController.updateContactSettings,
);

module.exports = router;

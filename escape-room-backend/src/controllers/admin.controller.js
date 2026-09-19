const adminService = require("../services/admin.service");
const paymentsService = require("../services/payments.service");
const waiversService = require("../services/waivers.service");
const { success } = require("../utils/response");

function login(req, res, next) {
  adminService.login(req.body, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function listThemes(req, res, next) {
  adminService.listThemes(function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function createTheme(req, res, next) {
  adminService.createTheme(
    {
      name: req.body.name,
      description: req.body.description || null,
      is_active: req.body.is_active,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 201, data);
    },
  );
}

function updateTheme(req, res, next) {
  adminService.updateTheme(
    {
      id: req.params.id,
      name: req.body.name,
      description: req.body.description,
      is_active: req.body.is_active,
      image_url: req.body.image_url,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

async function uploadThemeImage(req,res,next) {
  try {
    const {publicError,transaction}=require("../utils/transaction");
    const buffer=req.file?.buffer;
    if(!buffer) throw publicError(400,"Image required");
    const type=require("../utils/imageType").detect(buffer);
    if(!type || type.mime!==req.file.mimetype) throw publicError(400,"Image content does not match its type");
    const id=require("crypto").randomBytes(16).toString("hex")+type.ext;
    const result=await transaction(async client=>{
      const theme=(await client.query("SELECT id FROM themes WHERE id=$1 FOR UPDATE",[req.params.id])).rows[0];
      if(!theme) throw publicError(404,"Theme not found");
      await client.query("INSERT INTO app_assets(id,content_type,data) VALUES($1,$2,$3)",[id,type.mime,buffer]);
      const row=(await client.query("UPDATE themes SET image_url=$1 WHERE id=$2 RETURNING *",["/uploads/themes/"+id,theme.id])).rows[0];
      await client.query("INSERT INTO audit_logs(staff_id,action,entity_type,entity_id,details) VALUES($1,'upload_theme_image','theme',$2,'{}')",[req.staff.staff_id,theme.id]);
      return row;
    });
    return success(res,200,result);
  } catch(error) { next(error); }
}

function listBranches(req, res, next) {
  adminService.listBranches(function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function createBranch(req, res, next) {
  adminService.createBranch(
    {
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      open_time: req.body.open_time,
      close_time: req.body.close_time,
      is_active: req.body.is_active,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 201, data);
    },
  );
}

function updateBranch(req, res, next) {
  adminService.updateBranch(
    {
      id: req.params.id,
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      open_time: req.body.open_time,
      close_time: req.body.close_time,
      is_active: req.body.is_active,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function confirmBooking(req, res, next) {
  adminService.confirmBooking(
    {
      booking_id: req.params.id,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function getContactSettings(req, res, next) {
  adminService.getContactSettings(function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function updateContactSettings(req, res, next) {
  adminService.updateContactSettings(
    {
      phone: req.body.phone,
      address: req.body.address,
      email: req.body.email,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function confirmArrival(req, res, next) {
  adminService.confirmArrival(
    {
      booking_id: req.params.id,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function markNoShow(req, res, next) {
  adminService.markNoShow(
    {
      booking_id: req.params.id,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function completeBooking(req, res, next) {
  adminService.completeBooking(
    {
      booking_id: req.params.id,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function cancelBooking(req, res, next) {
  adminService.cancelBooking(
    {
      booking_id: req.params.id,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function createThemeSchedule(req, res, next) {
  adminService.createThemeSchedule(
    {
      room_id: req.body.room_id,
      theme_id: req.body.theme_id,
      start_at: req.body.start_at,
      end_at: req.body.end_at,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 201, data);
    },
  );
}

function updateThemeSchedule(req, res, next) {
  adminService.updateThemeSchedule(
    {
      id: req.params.id,
      room_id: req.body.room_id,
      theme_id: req.body.theme_id,
      start_at: req.body.start_at,
      end_at: req.body.end_at,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function listThemeSchedules(req, res, next) {
  adminService.listThemeSchedules(
    {
      date: req.query.date,
      branch_id: req.query.branch_id || null,
      room_id: req.query.room_id || null,
      theme_id: req.query.theme_id || null,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function deleteThemeSchedule(req, res, next) {
  adminService.deleteThemeSchedule({ id: req.params.id, staff_id: req.staff.staff_id }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function listRooms(req, res, next) {
  adminService.listRooms({ branch_id: req.query.branch_id || null }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function createRoom(req, res, next) {
  adminService.createRoom(
    {
      branch_id: req.body.branch_id,
      name: req.body.name,
      capacity_min: req.body.capacity_min,
      capacity_max: req.body.capacity_max,
      is_active: req.body.is_active,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 201, data);
    },
  );
}

function updateRoom(req, res, next) {
  adminService.updateRoom(
    {
      id: req.params.id,
      branch_id: req.body.branch_id,
      name: req.body.name,
      capacity_min: req.body.capacity_min,
      capacity_max: req.body.capacity_max,
      is_active: req.body.is_active,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function listBookings(req, res, next) {
  adminService.listBookingsByDate(
    {
      date: req.query.date || null,
      status: req.query.status || null,
      theme_id: req.query.theme_id || null,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function getBookingDetails(req, res, next) {
  adminService.getBookingDetails({ booking_id: req.params.id }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function markPaid(req, res, next) {
  paymentsService.markPaid(
    {
      booking_id: req.params.bookingId,
      method: req.body.method || "cash",
      reference_no: req.body.reference_no || null,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function dailyReport(req, res, next) {
  adminService.getDailyReport({ date: req.query.date }, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function generateWaivers(req, res, next) {
  waiversService.generateForBooking(
    {
      booking_id: req.params.id,
      staff_id: req.staff.staff_id,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function listWaivers(req, res, next) {
  waiversService.listWaiversForBooking(req.params.id, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function signWaiver(req, res, next) {
  if (!req.body.signature_base64) {
    var e = new Error("signature_base64 is required");
    e.status = 400;
    e.publicMessage = e.message;
    return next(e);
  }
  waiversService.signWaiver(
    {
      waiver_id: req.params.waiverId,
      booking_id: req.params.bookingId,
      signature_base64: req.body.signature_base64,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

function downloadWaiver(req, res, next) {
  waiversService.getWaiverFile(req.params.waiverId, function (err, filePath) {
    if (err) return next(err);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=waiver-" + req.params.waiverId + ".pdf");
    res.setHeader("Cache-Control", "no-store");
    if (Buffer.isBuffer(filePath)) return res.send(filePath);
    var stream = require("fs").createReadStream(filePath);
    stream.on("error", function (streamErr) { return next(streamErr); });
    stream.pipe(res);
  });
}

function listStaffUsers(req, res, next) {
  adminService.listStaffUsers(function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function createStaffUser(req, res, next) {
  adminService.createStaffUser(
    {
      full_name: req.body.full_name,
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      branch_id: req.body.branch_id || null,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 201, data);
    },
  );
}

function updateStaffUser(req, res, next) {
  adminService.updateStaffUser(
    {
      id: req.params.id,
      full_name: req.body.full_name,
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      branch_id: req.body.branch_id,
      is_active: req.body.is_active,
    },
    function (err, data) {
      if (err) return next(err);
      return success(res, 200, data);
    },
  );
}

module.exports = {
  login,
  listThemes,
  createTheme,
  updateTheme,
  uploadThemeImage,
  listBranches,
  createBranch,
  updateBranch,
  confirmBooking,
  confirmArrival,
  completeBooking,
  markNoShow,
  cancelBooking,
  createThemeSchedule,
  updateThemeSchedule,
  listThemeSchedules,
  deleteThemeSchedule,
  listRooms,
  createRoom,
  updateRoom,
  listBookings,
  getBookingDetails,
  markPaid,
  dailyReport,
  generateWaivers,
  listStaffUsers,
  createStaffUser,
  updateStaffUser,
  getContactSettings,
  updateContactSettings,
  listWaivers,
  signWaiver,
  downloadWaiver,
};

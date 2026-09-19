const { pool } = require("../config/db");
const { comparePassword, hashPassword } = require("../utils/password");
const { signAdminToken } = require("../utils/jwt");
const { insertAuditLog } = require("../utils/auditLog");
const { mapPgError } = require("../utils/pgError");
var waiversService = require("./waivers.service");

function makePublicError(status, message) {
  var e = new Error(message);
  e.status = status;
  e.publicMessage = message;
  return e;
}

function hasScheduleOverlap(payload, cb) {
  // منع تداخل جدول الثيم لنفس الغرفة في نفس الوقت
  var sql = [
    "SELECT id",
    "FROM room_theme_schedule",
    "WHERE room_id=$1",
    "AND start_at < $3",
    "AND end_at > $2",
    payload.exclude_id ? "AND id <> $4" : "",
    "LIMIT 1",
  ].join(" ");
  var params = payload.exclude_id
    ? [payload.room_id, payload.start_at, payload.end_at, payload.exclude_id]
    : [payload.room_id, payload.start_at, payload.end_at];
  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    return cb(null, result.rows.length > 0);
  });
}

function listThemes(cb) {
  // جلب الثيمات للوحة الموظفين
  var sql = [
    "SELECT id, name, description, image_url, is_active, created_at",
    "FROM themes",
    "ORDER BY id ASC",
  ].join(" ");
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    return cb(null, { themes: result.rows });
  });
}

function createTheme(payload, cb) {
  // إنشاء ثيم جديد من قبل موظف الحجز/المدير
  var sql = [
    "INSERT INTO themes(name, description, is_active, image_url)",
    "VALUES($1,$2,COALESCE($3,true),$4)",
    "RETURNING id, name, description, image_url, is_active, created_at",
  ].join(" ");
  pool.query(sql, [payload.name, payload.description || null, payload.is_active, payload.image_url || null], function (err, result) {
    if (err) {
      var mapped = mapPgError(err);
      if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
      return cb(err);
    }
    var row = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "create_theme",
        entity_type: "theme",
        entity_id: row.id,
        details: { name: row.name, description: row.description, is_active: row.is_active },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, row);
      },
    );
  });
}

function updateTheme(payload, cb) {
  // تحديث بيانات الثيم (الاسم/الوصف/الحالة/الصورة)
  var fields = [];
  var params = [];
  var idx = 1;

  if (payload.name != null) {
    fields.push("name=$" + idx);
    params.push(payload.name);
    idx += 1;
  }
  if (payload.description !== undefined) {
    fields.push("description=$" + idx);
    params.push(payload.description);
    idx += 1;
  }
  if (payload.is_active != null) {
    fields.push("is_active=$" + idx);
    params.push(payload.is_active === true);
    idx += 1;
  }
  if (payload.image_url !== undefined) {
    fields.push("image_url=$" + idx);
    params.push(payload.image_url);
    idx += 1;
  }
  if (fields.length === 0) return cb(makePublicError(400, "No fields to update"));

  params.push(payload.id);
  var sql = [
    "UPDATE themes",
    "SET " + fields.join(", "),
    "WHERE id=$" + idx,
    "RETURNING id, name, description, image_url, is_active, created_at",
  ].join(" ");
  pool.query(sql, params, function (err, result) {
    if (err) {
      var mapped = mapPgError(err);
      if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
      return cb(err);
    }
    if (result.rows.length === 0) return cb(makePublicError(404, "Theme not found"));
    var row = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "update_theme",
        entity_type: "theme",
        entity_id: row.id,
        details: { name: row.name, description: row.description, is_active: row.is_active },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, row);
      },
    );
  });
}

function listBranches(cb) {
  // جلب الفروع للوحة الموظفين فقط
  var sql = [
    "SELECT id, name, address, phone, open_time, close_time, is_active",
    "FROM branches",
    "WHERE is_active=true",
    "ORDER BY id ASC",
  ].join(" ");
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    return cb(null, { branches: result.rows });
  });
}

function createBranch(payload, cb) {
  // إنشاء فرع جديد (للمدير فقط)
  var sql = [
    "INSERT INTO branches(name, address, phone, open_time, close_time, is_active)",
    "VALUES($1,$2,$3,$4,$5,COALESCE($6,true))",
    "RETURNING id, name, address, phone, open_time, close_time, is_active, created_at",
  ].join(" ");
  pool.query(
    sql,
    [payload.name, payload.address || null, payload.phone || null, payload.open_time || null, payload.close_time || null, payload.is_active],
    function (err, result) {
      if (err) {
        var mapped = mapPgError(err);
        if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
        return cb(err);
      }
      var row = result.rows[0];
      insertAuditLog(
        {
          staff_id: payload.staff_id,
          action: "create_branch",
          entity_type: "branch",
          entity_id: row.id,
          details: {
            name: row.name,
            address: row.address,
            phone: row.phone,
            open_time: row.open_time,
            close_time: row.close_time,
            is_active: row.is_active,
          },
        },
        function (auditErr) {
          if (auditErr) return cb(auditErr);
          return cb(null, row);
        },
      );
    },
  );
}

function updateBranch(payload, cb) {
  // تعديل بيانات الفرع (للمدير فقط)
  var fields = [];
  var params = [];
  var idx = 1;
  if (payload.name != null) {
    fields.push("name=$" + idx);
    params.push(payload.name);
    idx += 1;
  }
  if (payload.address !== undefined) {
    fields.push("address=$" + idx);
    params.push(payload.address);
    idx += 1;
  }
  if (payload.phone !== undefined) {
    fields.push("phone=$" + idx);
    params.push(payload.phone);
    idx += 1;
  }
  if (payload.open_time !== undefined) {
    fields.push("open_time=$" + idx);
    params.push(payload.open_time);
    idx += 1;
  }
  if (payload.close_time !== undefined) {
    fields.push("close_time=$" + idx);
    params.push(payload.close_time);
    idx += 1;
  }
  if (payload.is_active != null) {
    fields.push("is_active=$" + idx);
    params.push(payload.is_active === true);
    idx += 1;
  }
  if (fields.length === 0) return cb(makePublicError(400, "No fields to update"));

  params.push(payload.id);
  var sql = [
    "UPDATE branches",
    "SET " + fields.join(", "),
    "WHERE id=$" + idx,
    "RETURNING id, name, address, phone, open_time, close_time, is_active, created_at",
  ].join(" ");
  pool.query(sql, params, function (err, result) {
    if (err) {
      var mapped = mapPgError(err);
      if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
      return cb(err);
    }
    if (result.rows.length === 0) return cb(makePublicError(404, "Branch not found"));
    var row = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "update_branch",
        entity_type: "branch",
        entity_id: row.id,
        details: {
          name: row.name,
          address: row.address,
          phone: row.phone,
          open_time: row.open_time,
          close_time: row.close_time,
          is_active: row.is_active,
        },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, row);
      },
    );
  });
}

function login(payload, cb) {
  // تسجيل دخول موظف لوحة التحكم
  var sql = [
    "SELECT id, full_name, username, password_hash, role, branch_id, is_active",
    "FROM staff_users WHERE username=$1 LIMIT 1",
  ].join(" ");
  pool.query(sql, [payload.username], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(401, "Invalid admin credentials"));
    var staff = result.rows[0];
    if (!staff.is_active) return cb(makePublicError(403, "Staff account is inactive"));

    comparePassword(payload.password, staff.password_hash, function (cmpErr, same) {
      if (cmpErr) return cb(cmpErr);
      if (!same) return cb(makePublicError(401, "Invalid admin credentials"));

      var token = signAdminToken({
        staff_id: staff.id,
        role: staff.role,
        branch_id: staff.branch_id,
      });

      return cb(null, {
        token: token,
        staff: {
          id: staff.id,
          full_name: staff.full_name,
          username: staff.username,
          role: staff.role,
          branch_id: staff.branch_id,
        },
      });
    });
  });
}

function confirmBooking(payload, cb) {
  var sql = [
    "UPDATE bookings",
    "SET status='confirmed'",
    "WHERE id=$1 AND status='pending'",
    "RETURNING id, status, start_at, end_at",
  ].join(" ");
  pool.query(sql, [payload.booking_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Booking not found or cannot be confirmed"));
    var updated = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "confirm_booking",
        entity_type: "booking",
        entity_id: updated.id,
        details: { status: updated.status },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        // Auto-generate waivers for all participants
        waiversService.generateForBooking(
          { booking_id: payload.booking_id, staff_id: payload.staff_id },
          function (waiverErr) {
            // Log waiver generation errors but don't fail the confirmation
            if (waiverErr) {
              console.error("[WAIVER] Auto-generation failed for booking %d: %s", payload.booking_id, waiverErr.message);
            }
            return cb(null, updated);
          },
        );
      },
    );
  });
}

function confirmArrival(payload, cb) {
  // تأكيد وصول الحجز وتحديث حالته
  var sql = [
    "UPDATE bookings",
    "SET status='arrived'",
    "WHERE id=$1 AND status IN ('confirmed','pending')",
    "RETURNING id, status, start_at, end_at",
  ].join(" ");
  pool.query(sql, [payload.booking_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Booking not found or cannot be moved to arrived"));

    var updated = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "confirm_arrival",
        entity_type: "booking",
        entity_id: updated.id,
        details: { status: updated.status },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, updated);
      },
    );
  });
}

function markNoShow(payload, cb) {
  // تحديث حالة الحجز إلى no_show — فقط الحجوزات المؤكدة
  var sql = [
    "UPDATE bookings",
    "SET status='no_show'",
    "WHERE id=$1 AND status='confirmed'",
    "RETURNING id, status, start_at, end_at",
  ].join(" ");
  pool.query(sql, [payload.booking_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Booking not found or cannot be moved to no_show"));
    var updated = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "mark_no_show",
        entity_type: "booking",
        entity_id: updated.id,
        details: { status: updated.status },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, updated);
      },
    );
  });
}

function completeBooking(payload, cb) {
  var sql = [
    "UPDATE bookings",
    "SET status='completed'",
    "WHERE id=$1 AND status='arrived'",
    "RETURNING id, status, start_at, end_at",
  ].join(" ");
  pool.query(sql, [payload.booking_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Booking not found or cannot be completed"));
    var updated = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "complete_booking",
        entity_type: "booking",
        entity_id: updated.id,
        details: { status: updated.status },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, updated);
      },
    );
  });
}

function cancelBooking(payload, cb) {
  var sql = [
    "UPDATE bookings",
    "SET status='cancelled'",
    "WHERE id=$1 AND status IN ('confirmed','pending')",
    "RETURNING id, status, start_at, end_at",
  ].join(" ");
  pool.query(sql, [payload.booking_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Booking not found or cannot be cancelled"));
    var updated = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "cancel_booking",
        entity_type: "booking",
        entity_id: updated.id,
        details: { status: updated.status },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, updated);
      },
    );
  });
}

function createThemeSchedule(payload, cb) {
  // إنشاء نافذة تفعيل ثيم لغرفة مع تدقيق التداخل
  hasScheduleOverlap(payload, function (checkErr, overlapped) {
    if (checkErr) return cb(checkErr);
    if (overlapped) return cb(makePublicError(409, "Schedule overlaps with existing schedule for this room"));

    var sql = [
      "INSERT INTO room_theme_schedule(room_id, theme_id, start_at, end_at)",
      "VALUES($1,$2,$3,$4)",
      "RETURNING id, room_id, theme_id, start_at, end_at, created_at",
    ].join(" ");
    pool.query(sql, [payload.room_id, payload.theme_id, payload.start_at, payload.end_at], function (err, result) {
      if (err) return cb(err);
      var row = result.rows[0];
      insertAuditLog(
        {
          staff_id: payload.staff_id,
          action: "create_theme_schedule",
          entity_type: "room_theme_schedule",
          entity_id: row.id,
          details: {
            room_id: row.room_id,
            theme_id: row.theme_id,
            start_at: row.start_at,
            end_at: row.end_at,
          },
        },
        function (auditErr) {
          if (auditErr) return cb(auditErr);
          return cb(null, row);
        },
      );
    });
  });
}

function listThemeSchedules(payload, cb) {
  var params = [];
  var where = [];
  var idx = 1;

  if (payload.date) {
    var dayStart = payload.date + "T00:00:00.000Z";
    var dayEnd = new Date(dayStart);
    dayEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000).toISOString();
    where.push("rts.end_at > $" + idx);
    params.push(dayStart);
    idx += 1;
    where.push("rts.start_at < $" + idx);
    params.push(dayEnd);
    idx += 1;
  }
  if (payload.room_id) {
    where.push("rts.room_id=$" + idx);
    params.push(payload.room_id);
    idx += 1;
  }
  if (payload.branch_id) {
    where.push("r.branch_id=$" + idx);
    params.push(payload.branch_id);
    idx += 1;
  }
  if (payload.theme_id) {
    where.push("rts.theme_id=$" + idx);
    params.push(payload.theme_id);
    idx += 1;
  }

  var sql = [
    "SELECT rts.id, rts.room_id, r.name AS room_name, r.branch_id, b.name AS branch_name,",
    "rts.theme_id, t.name AS theme_name, rts.start_at, rts.end_at, rts.created_at",
    "FROM room_theme_schedule rts",
    "JOIN rooms r ON r.id = rts.room_id",
    "JOIN branches b ON b.id = r.branch_id",
    "JOIN themes t ON t.id = rts.theme_id",
    where.length ? "WHERE " + where.join(" AND ") : "",
    "ORDER BY rts.start_at ASC",
  ].join(" ");
  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    return cb(null, { schedules: result.rows });
  });
}

function deleteThemeSchedule(payload, cb) {
  var sql = "DELETE FROM room_theme_schedule WHERE id=$1 RETURNING id, room_id, theme_id, start_at, end_at";
  pool.query(sql, [payload.id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Theme schedule not found"));
    var row = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "delete_theme_schedule",
        entity_type: "room_theme_schedule",
        entity_id: row.id,
        details: {
          room_id: row.room_id,
          theme_id: row.theme_id,
          start_at: row.start_at,
          end_at: row.end_at,
        },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, { deleted: true, id: row.id });
      },
    );
  });
}

function updateThemeSchedule(payload, cb) {
  // تعديل نافذة الثيم مع منع التداخل
  pool.query("SELECT id FROM room_theme_schedule WHERE id=$1 LIMIT 1", [payload.id], function (checkErr, checkRes) {
    if (checkErr) return cb(checkErr);
    if (checkRes.rows.length === 0) return cb(makePublicError(404, "Theme schedule not found"));

    hasScheduleOverlap(
      {
        room_id: payload.room_id,
        start_at: payload.start_at,
        end_at: payload.end_at,
        exclude_id: payload.id,
      },
      function (ovErr, overlapped) {
        if (ovErr) return cb(ovErr);
        if (overlapped) return cb(makePublicError(409, "Schedule overlaps with existing schedule for this room"));

        var sql = [
          "UPDATE room_theme_schedule",
          "SET room_id=$2, theme_id=$3, start_at=$4, end_at=$5",
          "WHERE id=$1",
          "RETURNING id, room_id, theme_id, start_at, end_at, created_at",
        ].join(" ");
        pool.query(sql, [payload.id, payload.room_id, payload.theme_id, payload.start_at, payload.end_at], function (err, result) {
          if (err) return cb(err);
          var row = result.rows[0];
          insertAuditLog(
            {
              staff_id: payload.staff_id,
              action: "update_theme_schedule",
              entity_type: "room_theme_schedule",
              entity_id: row.id,
              details: {
                room_id: row.room_id,
                theme_id: row.theme_id,
                start_at: row.start_at,
                end_at: row.end_at,
              },
            },
            function (auditErr) {
              if (auditErr) return cb(auditErr);
              return cb(null, row);
            },
          );
        });
      },
    );
  });
}

function listRooms(payload, cb) {
  // إرجاع القاعات للوحة الموظفين فقط
  var where = ["is_active=true"];
  var params = [];
  if (payload && payload.branch_id) {
    where.push("branch_id=$1");
    params.push(payload.branch_id);
  }
  var sql = [
    "SELECT id, name, branch_id, capacity_min, capacity_max, is_active",
    "FROM rooms",
    "WHERE " + where.join(" AND "),
    "ORDER BY id ASC",
  ].join(" ");
  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    return cb(null, { rooms: result.rows });
  });
}

function createRoom(payload, cb) {
  // إنشاء غرفة جديدة (للمدير فقط)
  var sql = [
    "INSERT INTO rooms(branch_id, name, capacity_min, capacity_max, is_active)",
    "VALUES($1,$2,$3,$4,COALESCE($5,true))",
    "RETURNING id, branch_id, name, capacity_min, capacity_max, is_active, created_at",
  ].join(" ");
  pool.query(
    sql,
    [
      payload.branch_id,
      payload.name,
      payload.capacity_min || 1,
      payload.capacity_max || 8,
      payload.is_active,
    ],
    function (err, result) {
      if (err) {
        var mapped = mapPgError(err);
        if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
        return cb(err);
      }
      var row = result.rows[0];
      insertAuditLog(
        {
          staff_id: payload.staff_id,
          action: "create_room",
          entity_type: "room",
          entity_id: row.id,
          details: {
            branch_id: row.branch_id,
            name: row.name,
            capacity_min: row.capacity_min,
            capacity_max: row.capacity_max,
            is_active: row.is_active,
          },
        },
        function (auditErr) {
          if (auditErr) return cb(auditErr);
          return cb(null, row);
        },
      );
    },
  );
}

function updateRoom(payload, cb) {
  // تعديل بيانات الغرفة (للمدير فقط)
  var fields = [];
  var params = [];
  var idx = 1;
  if (payload.branch_id != null) {
    fields.push("branch_id=$" + idx);
    params.push(payload.branch_id);
    idx += 1;
  }
  if (payload.name != null) {
    fields.push("name=$" + idx);
    params.push(payload.name);
    idx += 1;
  }
  if (payload.capacity_min != null) {
    fields.push("capacity_min=$" + idx);
    params.push(payload.capacity_min);
    idx += 1;
  }
  if (payload.capacity_max != null) {
    fields.push("capacity_max=$" + idx);
    params.push(payload.capacity_max);
    idx += 1;
  }
  if (payload.is_active != null) {
    fields.push("is_active=$" + idx);
    params.push(payload.is_active === true);
    idx += 1;
  }
  if (fields.length === 0) return cb(makePublicError(400, "No fields to update"));

  params.push(payload.id);
  var sql = [
    "UPDATE rooms",
    "SET " + fields.join(", "),
    "WHERE id=$" + idx,
    "RETURNING id, branch_id, name, capacity_min, capacity_max, is_active, created_at",
  ].join(" ");
  pool.query(sql, params, function (err, result) {
    if (err) {
      var mapped = mapPgError(err);
      if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
      return cb(err);
    }
    if (result.rows.length === 0) return cb(makePublicError(404, "Room not found"));
    var row = result.rows[0];
    insertAuditLog(
      {
        staff_id: payload.staff_id,
        action: "update_room",
        entity_type: "room",
        entity_id: row.id,
        details: {
          branch_id: row.branch_id,
          name: row.name,
          capacity_min: row.capacity_min,
          capacity_max: row.capacity_max,
          is_active: row.is_active,
        },
      },
      function (auditErr) {
        if (auditErr) return cb(auditErr);
        return cb(null, row);
      },
    );
  });
}

function listBookingsByDate(payload, cb) {
  var params = [];
  var where = [];
  var idx = 1;
  if (payload.date) {
    var dayStart = payload.date + "T00:00:00.000Z";
    var dayEnd = new Date(dayStart);
    dayEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000).toISOString();
    where.push("b.start_at >= $" + idx);
    params.push(dayStart);
    idx += 1;
    where.push("b.start_at < $" + idx);
    params.push(dayEnd);
    idx += 1;
  }
  if (payload.status) {
    where.push("b.status=$" + idx);
    params.push(payload.status);
    idx += 1;
  }
  if (payload.theme_id) {
    where.push("b.theme_id=$" + idx);
    params.push(payload.theme_id);
    idx += 1;
  }

  var sql = [
    "SELECT b.id, b.theme_id, t.name AS theme_name, b.start_at, b.end_at, b.status, b.fixed_price_iqd AS expected_amount_iqd,",
    "u.full_name AS booker_name, u.phone AS booker_phone,",
    "COUNT(bp.id)::int AS participants_count,",
    "COALESCE(p.amount_iqd,0)::bigint AS paid_amount_iqd, p.status AS payment_status",
    "FROM bookings b",
    "LEFT JOIN booking_participants bp ON bp.booking_id = b.id",
    "LEFT JOIN themes t ON t.id = b.theme_id",
    "LEFT JOIN users u ON u.id = b.user_id",
    "LEFT JOIN payments p ON p.booking_id = b.id",
    where.length ? "WHERE " + where.join(" AND ") : "",
    "GROUP BY b.id, t.name, u.full_name, u.phone, p.amount_iqd, p.status",
    "ORDER BY b.start_at DESC",
  ].join(" ");
  pool.query(sql, params, function (err, result) {
    if (err) return cb(err);
    return cb(null, { date: payload.date || null, bookings: result.rows });
  });
}

function getBookingDetails(payload, cb) {
  var sql = [
    "SELECT b.id, b.user_id, b.theme_id, t.name AS theme_name, b.start_at, b.end_at, b.status,",
    "b.fixed_price_iqd AS expected_amount_iqd,",
    "u.full_name AS booker_name, u.phone AS booker_phone,",
    "COALESCE(p.amount_iqd,0)::bigint AS paid_amount_iqd, p.status AS payment_status, p.method AS payment_method",
    "FROM bookings b",
    "LEFT JOIN themes t ON t.id = b.theme_id",
    "LEFT JOIN users u ON u.id = b.user_id",
    "LEFT JOIN payments p ON p.booking_id = b.id",
    "WHERE b.id=$1",
    "LIMIT 1",
  ].join(" ");
  pool.query(sql, [payload.booking_id], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(404, "Booking not found"));
    var booking = result.rows[0];
    var pSql = [
      "SELECT id, full_name, phone, is_primary, created_at",
      "FROM booking_participants",
      "WHERE booking_id=$1",
      "ORDER BY id ASC",
    ].join(" ");
    pool.query(pSql, [payload.booking_id], function (pErr, pRes) {
      if (pErr) return cb(pErr);
      return cb(null, {
        booking: booking,
        participants: pRes.rows,
      });
    });
  });
}

function getDailyReport(payload, cb) {
  var dayStart = payload.date + "T00:00:00.000Z";
  var dayEnd = new Date(dayStart);
  dayEnd = new Date(dayEnd.getTime() + 24 * 60 * 60 * 1000).toISOString();

  var bookingsSql = [
    "SELECT COUNT(*)::int AS bookings_count, COALESCE(SUM(fixed_price_iqd),0)::bigint AS total_revenue_iqd",
    "FROM bookings",
    "WHERE start_at >= $1 AND start_at < $2",
    "AND status NOT IN ('cancelled','no_show')",
  ].join(" ");
  pool.query(bookingsSql, [dayStart, dayEnd], function (bErr, bRes) {
    if (bErr) return cb(bErr);

    var participantsSql = [
      "SELECT COUNT(bp.id)::int AS total_participants",
      "FROM booking_participants bp",
      "JOIN bookings b ON b.id = bp.booking_id",
      "WHERE b.start_at >= $1 AND b.start_at < $2",
      "AND b.status NOT IN ('cancelled','no_show')",
    ].join(" ");
    pool.query(participantsSql, [dayStart, dayEnd], function (pErr, pRes) {
      if (pErr) return cb(pErr);

      var paidSql = [
        "SELECT COALESCE(SUM(p.amount_iqd),0)::bigint AS total_paid_iqd",
        "FROM payments p",
        "JOIN bookings b ON b.id = p.booking_id",
        "WHERE b.start_at >= $1 AND b.start_at < $2",
        "AND p.status='paid'",
      ].join(" ");
      pool.query(paidSql, [dayStart, dayEnd], function (payErr, payRes) {
        if (payErr) return cb(payErr);

        var bRow = bRes.rows[0] || {};
        var pRow = pRes.rows[0] || {};
        var payRow = payRes.rows[0] || {};
        return cb(null, {
          date: payload.date,
          bookings_count: Number(bRow.bookings_count || 0),
          total_participants: Number(pRow.total_participants || 0),
          total_revenue_iqd: Number(bRow.total_revenue_iqd || 0),
          total_paid_iqd: Number(payRow.total_paid_iqd || 0),
        });
      });
    });
  });
}

function listStaffUsers(cb) {
  // عرض المستخدمين الإداريين بدون كلمات مرور
  var sql = [
    "SELECT id, full_name, username, role, branch_id, is_active, created_at",
    "FROM staff_users",
    "ORDER BY id ASC",
  ].join(" ");
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    return cb(null, { staff_users: result.rows });
  });
}

function createStaffUser(payload, cb) {
  // إنشاء مستخدم إداري جديد مع تشفير كلمة المرور
  hashPassword(payload.password, function (hashErr, passwordHash) {
    if (hashErr) return cb(hashErr);
    var sql = [
      "INSERT INTO staff_users(full_name, username, password_hash, role, branch_id, is_active)",
      "VALUES($1,$2,$3,$4,$5,true)",
      "RETURNING id, full_name, username, role, branch_id, is_active, created_at",
    ].join(" ");
    pool.query(
      sql,
      [payload.full_name, payload.username, passwordHash, payload.role, payload.branch_id || null],
      function (err, result) {
        if (err) {
          var mapped = mapPgError(err);
          if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
          return cb(err);
        }
        return cb(null, result.rows[0]);
      },
    );
  });
}

function updateStaffUser(payload, cb) {
  // تعديل بيانات مستخدم إداري (المدير فقط)
  pool.query("SELECT id FROM staff_users WHERE id=$1 LIMIT 1", [payload.id], function (checkErr, checkRes) {
    if (checkErr) return cb(checkErr);
    if (checkRes.rows.length === 0) return cb(makePublicError(404, "Staff user not found"));

    function runUpdate(passwordHash) {
      var fields = [];
      var params = [];
      var idx = 1;

      if (payload.full_name != null) {
        fields.push("full_name=$" + idx);
        params.push(payload.full_name);
        idx += 1;
      }
      if (payload.username != null) {
        fields.push("username=$" + idx);
        params.push(payload.username);
        idx += 1;
      }
      if (payload.role != null) {
        fields.push("role=$" + idx);
        params.push(payload.role);
        idx += 1;
      }
      if (payload.branch_id !== undefined) {
        fields.push("branch_id=$" + idx);
        params.push(payload.branch_id);
        idx += 1;
      }
      if (payload.is_active != null) {
        fields.push("is_active=$" + idx);
        params.push(payload.is_active === true);
        idx += 1;
      }
      if (passwordHash) {
        fields.push("password_hash=$" + idx);
        params.push(passwordHash);
        idx += 1;
      }

      if (fields.length === 0) return cb(makePublicError(400, "No fields to update"));

      params.push(payload.id);
      var sql = [
        "UPDATE staff_users",
        "SET " + fields.join(", "),
        "WHERE id=$" + idx,
        "RETURNING id, full_name, username, role, branch_id, is_active, created_at",
      ].join(" ");
      pool.query(sql, params, function (err, result) {
        if (err) {
          var mapped = mapPgError(err);
          if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
          return cb(err);
        }
        return cb(null, result.rows[0]);
      });
    }

    if (payload.password != null) {
      return hashPassword(payload.password, function (hashErr, passwordHash) {
        if (hashErr) return cb(hashErr);
        return runUpdate(passwordHash);
      });
    }
    return runUpdate(null);
  });
}

function getContactSettings(cb) {
  var sql = "SELECT key, value FROM app_settings WHERE key IN ('contact_phone','contact_address','contact_email')";
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    var out = {};
    for (var i = 0; i < result.rows.length; i += 1) {
      out[result.rows[i].key] = result.rows[i].value;
    }
    return cb(null, {
      phone: out.contact_phone || "",
      address: out.contact_address || "",
      email: out.contact_email || "",
    });
  });
}

function updateContactSettings(payload, cb) {
  var keys = ["contact_phone", "contact_address", "contact_email"];
  var vals = [payload.phone, payload.address, payload.email];
  var done = 0;
  var errored = false;
  var total = keys.length;

  for (var i = 0; i < keys.length; i += 1) {
    if (vals[i] == null) {
      done += 1;
      if (done === total) return cb(null, { updated: true });
      continue;
    }
    (function (k, v) {
      pool.query("INSERT INTO app_settings(key, value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=NOW()", [k, v], function (err) {
        if (errored) return;
        if (err) {
          errored = true;
          return cb(err);
        }
        done += 1;
        if (done === total) return cb(null, { updated: true });
      });
    })(keys[i], vals[i]);
  }
}

module.exports = {
  listThemes,
  createTheme,
  updateTheme,
  listBranches,
  createBranch,
  updateBranch,
  login,
  confirmBooking,
  confirmArrival,
  completeBooking,
  markNoShow,
  cancelBooking,
  createThemeSchedule,
  listThemeSchedules,
  deleteThemeSchedule,
  updateThemeSchedule,
  listRooms,
  createRoom,
  updateRoom,
  listBookingsByDate,
  getBookingDetails,
  getDailyReport,
  listStaffUsers,
  createStaffUser,
  updateStaffUser,
  getContactSettings,
  updateContactSettings,
};

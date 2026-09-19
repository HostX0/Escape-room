const { pool } = require("../config/db");
const { normalizePhone } = require("../utils/validators");
const { mapPgError } = require("../utils/pgError");

function makePublicError(status, message) {
  var e = new Error(message);
  e.status = status;
  e.publicMessage = message;
  return e;
}

function getSetting(key, fallback, cb) {
  pool.query("SELECT value FROM app_settings WHERE key=$1", [key], function (err, r) {
    if (err) return cb(err);
    if (r.rows.length === 0) return cb(null, fallback);
    return cb(null, r.rows[0].value);
  });
}

function calcEndAt(startAtIso, durationMin) {
  var start = new Date(startAtIso);
  var end = new Date(start.getTime() + Number(durationMin) * 60 * 1000);
  return end.toISOString();
}

function validateParticipantsArray(participants, cb) {
  if (!Array.isArray(participants) || participants.length === 0) {
    return cb(makePublicError(400, "participants must be a non-empty array"));
  }
  if (participants.length < 1 || participants.length > 8) {
    return cb(makePublicError(400, "participants count must be between 1 and 8"));
  }

  var primaryCount = 0;
  var phoneMap = {};
  for (var i = 0; i < participants.length; i += 1) {
    var p = participants[i] || {};
    if (!String(p.full_name || "").trim()) {
      return cb(makePublicError(400, "participant full_name is required"));
    }
    var ph = normalizePhone(String(p.phone || "").trim());
    if (!ph) return cb(makePublicError(400, "participant phone is invalid"));
    if (phoneMap[ph]) return cb(makePublicError(409, "Participant phone is duplicated in this booking"));
    phoneMap[ph] = true;
    if (p.is_primary === true) primaryCount += 1;
  }
  if (primaryCount !== 1) {
    return cb(makePublicError(400, "Exactly one primary participant is required"));
  }
  return cb(null);
}

function listThemes(cb) {
  // إرجاع جميع الثيمات النشطة مع عدد الأماكن المتاحة اليوم
  var sql = [
    "SELECT t.id, t.name, t.description, t.image_url,",
    "(SELECT COUNT(*) FROM room_theme_schedule rts",
    "  WHERE rts.theme_id=t.id AND rts.start_at::date = CURRENT_DATE AND rts.start_at > NOW()",
    "  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.theme_id=rts.theme_id AND b.start_at=rts.start_at AND b.status NOT IN ('cancelled'))",
    ") AS slots_available_today",
    "FROM themes t",
    "WHERE t.is_active=true",
    "ORDER BY t.id ASC",
  ].join(" ");
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    return cb(null, { themes: result.rows });
  });
}

function listThemeAvailability(payload, cb) {
  getSetting("booking_duration_min", "60", function (err, durationMinStr) {
    if (err) return cb(err);
    var durationMin = Number(durationMinStr) || 60;

    var dayStart, dayEnd;
    try { [dayStart,dayEnd]=require("../utils/bookingRules").dateBounds(payload.date); } catch(error) { return cb(error); }

    var scheduleSql = [
      "SELECT rts.id, rts.room_id, rts.start_at, rts.end_at, b.name AS branch_name",
      "FROM room_theme_schedule rts",
      "JOIN rooms r ON r.id = rts.room_id",
      "JOIN branches b ON b.id = r.branch_id",
      "WHERE rts.theme_id=$1 AND r.is_active AND b.is_active AND EXISTS(SELECT 1 FROM themes t WHERE t.id=rts.theme_id AND t.is_active)",
      "AND rts.end_at > $2",
      "AND rts.start_at < $3",
      "ORDER BY rts.start_at ASC",
    ].join(" ");
    pool.query(scheduleSql, [payload.theme_id, dayStart.toISOString(), dayEnd.toISOString()], function (sErr, sRes) {
      if (sErr) return cb(sErr);
      if (sRes.rows.length === 0) {
        return cb(null, { theme_id: Number(payload.theme_id), date: payload.date, slots: [] });
      }

      var roomIdsMap = {};
      for (var i = 0; i < sRes.rows.length; i += 1) roomIdsMap[sRes.rows[i].room_id] = true;
      var roomIds = Object.keys(roomIdsMap).map(Number);

      var bookingsSql = [
        "SELECT room_id, start_at, end_at",
        "FROM bookings",
        "WHERE room_id = ANY($1::bigint[])",
        "AND start_at < $3",
        "AND end_at > $2",
        "AND status NOT IN ('cancelled','no_show')",
      ].join(" ");
      pool.query(bookingsSql, [roomIds, dayStart.toISOString(), dayEnd.toISOString()], function (bErr, bRes) {
        if (bErr) return cb(bErr);

        var slotsMap = {};
        var stepMin = 30; // توليد مواعيد كل نصف ساعة

        for (var j = 0; j < sRes.rows.length; j += 1) {
          var sch = sRes.rows[j];
          var winStart = new Date(Math.max(new Date(sch.start_at).getTime(), dayStart.getTime()));
          var winEnd = new Date(Math.min(new Date(sch.end_at).getTime(), dayEnd.getTime()));
          var cursor = new Date(winStart);

          while (cursor.getTime() + durationMin * 60 * 1000 <= winEnd.getTime()) {
            var slotStart = new Date(cursor);
            var slotEnd = new Date(slotStart.getTime() + durationMin * 60 * 1000);
            var occupied = false;

            for (var k = 0; k < bRes.rows.length; k += 1) {
              var bk = bRes.rows[k];
              if (Number(bk.room_id) !== Number(sch.room_id)) continue;
              if (slotStart.getTime() < new Date(bk.end_at).getTime() && slotEnd.getTime() > new Date(bk.start_at).getTime()) {
                occupied = true;
                break;
              }
            }
            if (!occupied && slotStart.getTime() > Date.now()) {
              var slotKey = slotStart.toISOString();
              if (!slotsMap[slotKey]) {
                slotsMap[slotKey] = {
                  start_at: slotStart.toISOString(),
                  end_at: slotEnd.toISOString(),
                  schedule_id: sch.id || null,
                  branch_name: sch.branch_name || null,
                };
              }
            }
            cursor = new Date(cursor.getTime() + stepMin * 60 * 1000);
          }
        }

        var slots = Object.keys(slotsMap)
          .sort()
          .map(function (k) {
            return slotsMap[k];
          });
        return cb(null, {
          theme_id: Number(payload.theme_id),
          date: payload.date,
          duration_min: durationMin,
          slots: slots,
        });
      });
    });
  });
}

function chooseRoomForThemeSlot(client, themeId, startAtIso, endAtIso, cb) {
  var sql = [
    "SELECT r.id AS room_id, r.branch_id, b.name AS branch_name",
    "FROM rooms r",
    "JOIN branches b ON b.id = r.branch_id",
    "JOIN room_theme_schedule rts ON rts.room_id = r.id",
    "WHERE r.is_active=true",
    "AND rts.theme_id=$1",
    "AND rts.start_at <= $2",
    "AND rts.end_at >= $3",
    "AND NOT EXISTS (",
    "  SELECT 1 FROM bookings bk",
    "  WHERE bk.room_id = r.id",
    "  AND bk.start_at < $3",
    "  AND bk.end_at > $2",
    "  AND bk.status NOT IN ('cancelled','no_show')",
    ")",
    "ORDER BY r.id ASC",
    "LIMIT 1",
    "FOR UPDATE OF r",
  ].join(" ");
  client.query(sql, [themeId, startAtIso, endAtIso], function (err, result) {
    if (err) return cb(err);
    if (result.rows.length === 0) return cb(makePublicError(409, "No available slot for this theme at selected time"));
    return cb(null, result.rows[0]);
  });
}

function createPublicBooking(payload, cb) {
  require("../utils/transaction").callback(require("./bookingEngine").create(payload).then(({booking,payment,room})=>({
    booking:{id:booking.id,theme:{id:booking.theme_id,name:room.theme_name,description:room.description},branch_name:room.branch_name,start_at:booking.start_at,end_at:booking.end_at,amount_iqd:booking.fixed_price_iqd,status:booking.status}, payment
  })),cb);
}

function confirmPublicBooking(payload, cb) {
  // تأكيد الحجز من واجهة العميل بدون كشف بيانات القاعة/الفرع
  var sql = [
    "UPDATE bookings",
    "SET status='confirmed'",
    "WHERE id=$1 AND user_id=$2 AND status='pending' AND start_at>NOW()",
    "RETURNING id, theme_id, branch_id, start_at, end_at, fixed_price_iqd, status",
  ].join(" ");
  pool.query(sql, [payload.booking_id, payload.user_id], function (err, result) {
    if (err) {
      var mapped = mapPgError(err);
      if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
      return cb(err);
    }
    if (result.rows.length === 0) {
      return cb(makePublicError(404, "Booking not found or cannot be confirmed"));
    }
    var booking = result.rows[0];
    pool.query("SELECT name FROM branches WHERE id=$1 LIMIT 1", [booking.branch_id], function (bErr, bRes) {
      if (bErr) return cb(bErr);
      return cb(null, {
        booking: {
          id: booking.id,
          theme_id: booking.theme_id,
          branch_name: bRes.rows[0] ? bRes.rows[0].name : null,
          start_at: booking.start_at,
          end_at: booking.end_at,
          amount_iqd: booking.fixed_price_iqd,
          status: booking.status,
        },
      });
    });
  });
}

function getThemeRatings(themeId, cb) {
  var sql = [
    "SELECT tr.id, tr.rating, tr.comment, tr.created_at, u.full_name",
    "FROM theme_ratings tr",
    "JOIN users u ON u.id = tr.user_id",
    "WHERE tr.theme_id=$1",
    "ORDER BY tr.created_at DESC",
    "LIMIT 20",
  ].join(" ");
  pool.query(sql, [themeId], function (err, result) {
    if (err) return cb(err);
    var avgSql = "SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*)::int AS total_ratings FROM theme_ratings WHERE theme_id=$1";
    pool.query(avgSql, [themeId], function (avgErr, avgRes) {
      if (avgErr) return cb(avgErr);
      var stats = avgRes.rows[0] || {};
      return cb(null, {
        theme_id: Number(themeId),
        avg_rating: stats.avg_rating ? Number(stats.avg_rating) : null,
        total_ratings: Number(stats.total_ratings || 0),
        ratings: result.rows,
      });
    });
  });
}

function getThemesWithRatings(cb) {
  var sql = [
    "SELECT t.id AS theme_id, COALESCE(AVG(tr.rating)::numeric(3,2), 0) AS avg_rating, COUNT(tr.id)::int AS total_ratings",
    "FROM themes t",
    "LEFT JOIN theme_ratings tr ON tr.theme_id = t.id",
    "WHERE t.is_active=true",
    "GROUP BY t.id",
  ].join(" ");
  pool.query(sql, [], function (err, result) {
    if (err) return cb(err);
    return cb(null, result.rows);
  });
}

function submitRating(payload, cb) {
  // verify booking belongs to user and is completed/arrived
  var checkSql = [
    "SELECT id, theme_id, status FROM bookings",
    "WHERE id=$1 AND user_id=$2",
    "LIMIT 1",
  ].join(" ");
  pool.query(checkSql, [payload.booking_id, payload.user_id], function (checkErr, checkRes) {
    if (checkErr) return cb(checkErr);
    if (checkRes.rows.length === 0) return cb(makePublicError(404, "Booking not found"));
    var booking = checkRes.rows[0];
    if (booking.status !== "arrived" && booking.status !== "completed") {
      return cb(makePublicError(400, "You can only rate completed bookings"));
    }
    var sql = [
      "INSERT INTO theme_ratings(theme_id, user_id, booking_id, rating, comment)",
      "VALUES($1,$2,$3,$4,$5)",
      "ON CONFLICT(booking_id, user_id) DO UPDATE SET rating=$4, comment=$5",
      "RETURNING id, theme_id, rating, comment, created_at",
    ].join(" ");
    pool.query(sql, [booking.theme_id, payload.user_id, payload.booking_id, payload.rating, payload.comment || null], function (err, result) {
      if (err) {
        var mapped = mapPgError(err);
        if (mapped) return cb(makePublicError(mapped.status, mapped.publicMessage));
        return cb(err);
      }
      return cb(null, result.rows[0]);
    });
  });
}

function getContactInfo(cb) {
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

module.exports = {
  listThemes,
  listThemeAvailability,
  createPublicBooking,
  confirmPublicBooking,
  getThemeRatings,
  getThemesWithRatings,
  submitRating,
  getContactInfo,
};

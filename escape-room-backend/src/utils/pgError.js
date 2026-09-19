// خريطة أخطاء PostgreSQL إلى رسائل مفهومة للواجهة
function mapPgError(err) {
  if (!err || !err.code) return null;

  // تعارض حجوزات نفس الغرفة في نفس الوقت
  if (err.code === "23P01") {
    if (String(err.constraint || "").includes("bookings_no_overlap")) {
      return { status: 409, publicMessage: "This time slot was just booked. Please choose another time." };
    }
    return { status: 409, publicMessage: "Selected slot is no longer available" };
  }

  // أخطاء التكرار
  if (err.code === "23505") {
    var c = String(err.constraint || "");
    if (c === "uq_participant_phone_per_booking") {
      return {
        status: 409,
        publicMessage: "Participant phone is duplicated in this booking",
      };
    }
    if (c === "uq_booking_one_primary") {
      return { status: 409, publicMessage: "Only one primary participant is allowed" };
    }
    if (c.includes("users_phone")) {
      return { status: 409, publicMessage: "Phone already registered" };
    }
    if (c.includes("staff_users_username")) {
      return { status: 409, publicMessage: "Username already exists" };
    }
    if (c.includes("waivers_participant_id_key")) {
      return { status: 409, publicMessage: "Waiver already generated for this participant" };
    }
    return { status: 409, publicMessage: "Duplicate value violates unique rule" };
  }

  // أخطاء المفاتيح الأجنبية
  if (err.code === "23503") {
    return { status: 400, publicMessage: "Referenced record was not found" };
  }

  // check constraints
  if (err.code === "23514") {
    return { status: 400, publicMessage: "Invalid value for constrained field" };
  }

  return null;
}

module.exports = { mapPgError };

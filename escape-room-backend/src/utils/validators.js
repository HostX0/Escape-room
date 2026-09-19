function isNotEmptyText(v, maxLen) {
  if (typeof v !== "string") return false;
  var t = v.trim();
  if (!t) return false;
  if (maxLen != null && t.length > maxLen) return false;
  return true;
}

function normalizePhone(phone) {
  if (typeof phone !== "string") return null;
  var p = phone.trim().replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  return p;
}

function isValidPhone(phone) {
  var p = normalizePhone(phone);
  if (!p) return false;
  var digits = p.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  // Accept Iraqi local numbers (07...), Iraqi international (+964...), or any international (+...)
  if (/^07[0-9]{8,10}$/.test(p)) return true;
  if (/^\+964[0-9]{9,11}$/.test(p)) return true;
  if (/^\+[1-9][0-9]{8,14}$/.test(p)) return true;
  return false;
}

/**
 * Password must be at least 8 characters and contain:
 * - At least one uppercase letter OR one digit
 * - At least one lowercase letter
 */
function isValidPassword(password) {
  if (typeof password !== "string") return false;
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z0-9]/.test(password)) return false;
  return true;
}

function isISODateTime(v) {
  if (typeof v !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(new Date(v).getTime());
}

function toInt(v) {
  var n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

module.exports = {
  isNotEmptyText,
  normalizePhone,
  isValidPhone,
  isValidPassword,
  isISODateTime,
  toInt,
};

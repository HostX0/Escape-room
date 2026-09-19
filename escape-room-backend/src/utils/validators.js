function isNotEmptyText(v, maxLen) {
  if (typeof v !== "string") return false;
  var t = v.trim();
  if (!t) return false;
  if (maxLen != null && t.length > maxLen) return false;
  return true;
}

function normalizePhone(phone) {
  if (typeof phone !== "string") return null;
  let p=phone.trim().replace(/[٠-٩]/g,x=>String("٠١٢٣٤٥٦٧٨٩".indexOf(x))).replace(/[۰-۹]/g,x=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(x)));
  if (/[^\d+\s()\-]/.test(p)) return null;
  p=p.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p="+"+p.slice(2);
  if (/^07\d{9}$/.test(p)) p="+964"+p.slice(1);
  if (/^9647\d{9}$/.test(p)) p="+"+p;
  return p;
}

function isValidPhone(phone) {
  const p=normalizePhone(phone);
  if(!p) return false;
  if(p.startsWith("+964")) return /^\+9647\d{9}$/.test(p);
  return /^\+[1-9]\d{8,14}$/.test(p);
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
  const m=v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
  if(!m||+m[2]>23||+m[3]>59||(m[4]&&+m[4]>59)||Number.isNaN(Date.parse(v))) return false;
  const date=new Date(m[1]+"T00:00:00Z");
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===m[1];
}

function toInt(v) {
  if(typeof v!=="number"&&(typeof v!=="string"||!/^\d+$/.test(v))) return null;
  const n=Number(v);
  return Number.isSafeInteger(n)&&n>0?n:null;
}

module.exports = {
  isNotEmptyText,
  normalizePhone,
  isValidPhone,
  isValidPassword,
  isISODateTime,
  toInt,
};

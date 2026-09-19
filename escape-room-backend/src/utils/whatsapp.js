const axios = require("axios");
const env = require("../config/env");

/**
 * Send OTP code via WhatsApp using UltraMsg API
 *
 * @param {string} phone — recipient phone (e.g. "07700000001" or "+9647700000001")
 * @param {string} code — the 6-digit verification code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendWhatsAppOTP(phone, code) {
  // Normalize phone to international format for WhatsApp
  var to = normalizeToInternational(phone);
  if (!to) {
    console.error("[WhatsApp] Invalid phone format");
    return { success: false, error: "Invalid phone number" };
  }

  var instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  var token = process.env.ULTRAMSG_TOKEN;

  // Refuse fake delivery when the verification provider is not configured.
  if (!instanceId || !token) {
    return { success: false, error: "Phone verification provider is not configured" };
  }

  var message =
    "*Switch Escape Room*\n\n" +
    "رمز التحقق الخاص بك هو:\n\n" +
    "*" + code + "*\n\n" +
    "صالح لمدة 10 دقائق\n" +
    "لا تشارك هذا الرمز مع أي شخص.\n\n" +
    "Your verification code is: *" + code + "*\n" +
    "Valid for 10 minutes. Do not share this code.";

  try {
    var url = "https://api.ultramsg.com/" + instanceId + "/messages/chat";
    var response = await axios.post(url, {
      token: token,
      to: to,
      body: message,
    }, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });

    if (response.data && response.data.sent === "true") {
      console.log("[WhatsApp] Verification message accepted by provider");
      return { success: true, error: null };
    }

    console.error("[WhatsApp] Provider rejected verification delivery");
    return { success: false, error: response.data?.message || "Send failed" };
  } catch (err) {
    console.error("[WhatsApp] API error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Convert Iraqi local number to international format
 * "07700000001" → "9647700000001"
 * "+9647700000001" → "9647700000001"
 */
function normalizeToInternational(phone) {
  if (!phone) return null;
  var p = String(phone).trim().replace(/[^\d+]/g, "");

  // Already international with +
  if (p.startsWith("+964")) return p.slice(1); // remove +
  if (p.startsWith("964")) return p;

  // Iraqi local format 07...
  if (p.startsWith("07")) return "964" + p.slice(1);

  // Other international
  if (p.startsWith("+")) return p.slice(1);

  return p;
}

module.exports = { sendWhatsAppOTP };

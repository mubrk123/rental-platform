// backend/utils/notifyUser.js
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/* --------------------------------------------------
   TEMPLATE SIDs
-------------------------------------------------- */
const templates = {
  OTP: process.env.TWILIO_TEMPLATE_OTP_SID,
  BOOKING_CONFIRMATION: process.env.TWILIO_TEMPLATE_CONFIRM_SID,
  THANK_YOU: process.env.TWILIO_TEMPLATE_THANKYOU_SID,
  BOOKING_ALERT_HANDLER: process.env.TWILIO_TEMPLATE_HANDLER_SID,
  BOOKING_ALERT_ADMIN: process.env.TWILIO_TEMPLATE_ADMIN_SID,
};

/* --------------------------------------------------
   FORMATTERS
-------------------------------------------------- */
const formatWa = (n) => {
  if (!n) throw new Error("Phone missing");
  if (n.startsWith("whatsapp:")) return n;
  if (n.startsWith("+")) return `whatsapp:${n}`;
  if (n.length === 10) return `whatsapp:+91${n}`;
  return `whatsapp:${n}`;
};

const formatSms = (n) => {
  if (!n) throw new Error("Phone missing");
  if (n.startsWith("+")) return n;
  if (n.length === 10) return `+91${n}`;
  return n;
};

/* --------------------------------------------------
   SEND WHATSAPP TEMPLATE
-------------------------------------------------- */
export const sendWhatsAppTemplate = async (to, type, vars = {}) => {
  const formattedTo = formatWa(to);
  const contentSid = templates[type];
  if (!contentSid) throw new Error(`Missing template SID: ${type}`);

  const normalizedVars =
    type === "OTP"
      ? { "1": String(vars["1"] || vars.otp || vars.code) }
      : Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]));

  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedTo,
      contentSid,
      contentVariables: JSON.stringify(normalizedVars),
    });
    console.log(`📩 WA template (${type}) sent → ${formattedTo}`);
    return msg.sid;
  } catch (err) {
    console.error(`❌ WA template failed (${type}):`, err.message);
    throw err;
  }
};

/* --------------------------------------------------
   SEND PURE WHATSAPP TEXT
-------------------------------------------------- */
export const sendWhatsAppText = async (to, body) => {
  const formattedTo = formatWa(to);
  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedTo,
      body,
    });
    console.log(`💬 WA text sent → ${formattedTo}`);
    return msg.sid;
  } catch (err) {
    console.error("❌ WA text failed:", err.message);
    throw err;
  }
};

/* --------------------------------------------------
   SEND SMS (Admin)
-------------------------------------------------- */
export const sendSMS = async (to, body) => {
  const formatted = formatSms(to);
  try {
    const msg = await client.messages.create({
      body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: formatted,
    });
    console.log(`📲 SMS sent → ${formatted}`);
    return msg.sid;
  } catch (err) {
    console.error("❌ SMS failed:", err.message);
    throw err;
  }
};

/* --------------------------------------------------
   ADMIN ALERT (WhatsApp + SMS ALWAYS)
-------------------------------------------------- */
export const sendAdminAlert = async ({ vars = {}, text = "" }) => {
  const admin = process.env.ADMIN_WHATSAPP_NUMBER || process.env.MAIN_ADMIN_NUMBER;

  if (!admin) throw new Error("Admin phone missing");

  let waSuccess = false;

  // 1️⃣ Try WhatsApp template
  if (templates.BOOKING_ALERT_ADMIN) {
    try {
      await sendWhatsAppTemplate(admin, "BOOKING_ALERT_ADMIN", vars);
      console.log("📩 Admin WA template sent");
      waSuccess = true;
    } catch (err) {
      console.warn("⚠️ Admin WA template failed:", err.message);
    }
  }

  // 2️⃣ Fallback → WhatsApp text
  if (!waSuccess) {
    try {
      await sendWhatsAppText(admin, text);
      console.log("📩 Admin WA text sent");
      waSuccess = true;
    } catch (err) {
      console.warn("⚠️ Admin WA text failed:", err.message);
    }
  }

  // 3️⃣ ALWAYS SEND SMS
  try {
    await sendSMS(admin, text);
    console.log("📲 Admin SMS sent (forced)");
  } catch (err) {
    console.error("❌ Admin SMS failed:", err.message);
  }
};


/* --------------------------------------------------
   HANDLER ALERT (WA TEMPLATE → WA TEXT)
-------------------------------------------------- */
export const sendHandlerAlert = async ({ phone, vars = {}, text = "" }) => {
  if (!phone) throw new Error("Handler phone missing");

  // 1️⃣ Try template
  if (templates.BOOKING_ALERT_HANDLER) {
    try {
      return await sendWhatsAppTemplate(phone, "BOOKING_ALERT_HANDLER", vars);
    } catch (err) {
      console.warn("⚠️ Handler template failed:", err.message);
    }
  }

  // 2️⃣ Fallback → WA text
  try {
    return await sendWhatsAppText(phone, text);
  } catch (err) {
    console.error("❌ Handler WA failed:", err.message);
    throw err;
  }
};

export default client;

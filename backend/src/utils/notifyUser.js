// backend/utils/notifyUser.js
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

/* --------------------------------------------------
   TWILIO CLIENT
-------------------------------------------------- */
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/* --------------------------------------------------
   TEMPLATE SIDS (USER ONLY)
-------------------------------------------------- */
const templates = {
  OTP: process.env.TWILIO_TEMPLATE_OTP_SID,
  BOOKING_CONFIRMATION: process.env.TWILIO_TEMPLATE_CONFIRM_SID,
  THANK_YOU: process.env.TWILIO_TEMPLATE_THANKYOU_SID,
};

/* --------------------------------------------------
   FORMATTERS
-------------------------------------------------- */
const formatSms = (n) => {
  if (!n) throw new Error("Phone missing");
  if (n.startsWith("+")) return n;
  if (n.length === 10) return `+91${n}`;
  return n;
};

const formatWa = (n) => {
  if (!n) throw new Error("Phone missing");
  if (n.startsWith("whatsapp:")) return n;
  if (n.startsWith("+")) return `whatsapp:${n}`;
  if (n.length === 10) return `whatsapp:+91${n}`;
  return `whatsapp:${n}`;
};

/* --------------------------------------------------
   USER → OTP (SMS ONLY)
-------------------------------------------------- */
export const sendOtpSMS = async (to, otp) => {
  const formatted = formatSms(to);
  try {
    const msg = await client.messages.create({
      to: formatted,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      body: `Your NewBikeWorld OTP is ${otp}. Do not share it with anyone.`,
    });
    console.log(`✅ OTP SMS sent → ${formatted}`);
    return msg.sid;
  } catch (err) {
    console.error("❌ OTP SMS failed:", err.message);
    throw err;
  }
};

/* --------------------------------------------------
   USER → WHATSAPP TEMPLATE
-------------------------------------------------- */
export const sendUserWhatsAppTemplate = async (to, type, vars = {}) => {
  const contentSid = templates[type];
  if (!contentSid) throw new Error(`Missing WhatsApp template: ${type}`);

  const formattedTo = formatWa(to);
  const normalizedVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, String(v)])
  );

  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedTo,
      contentSid,
      contentVariables: JSON.stringify(normalizedVars),
    });
    console.log(`📩 User WhatsApp sent (${type}) → ${formattedTo}`);
    return msg.sid;
  } catch (err) {
    console.error(`❌ User WhatsApp failed (${type}):`, err.message);
    throw err;
  }
};

/* --------------------------------------------------
   ADMIN → SMS ONLY
-------------------------------------------------- */
export const sendAdminSMSAlert = async (text) => {
  const adminNumber =
    process.env.MAIN_ADMIN_NUMBER || process.env.ADMIN_WHATSAPP_NUMBER;

  if (!adminNumber) {
    console.warn("⚠️ Admin phone number missing");
    return;
  }

  const formatted = formatSms(adminNumber);

  try {
    const msg = await client.messages.create({
      to: formatted,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      body: text,
    });
    console.log(`📲 Admin SMS sent → ${formatted}`);
    return msg.sid;
  } catch (err) {
    console.error("❌ Admin SMS failed:", err.message);
    throw err;
  }
};

/* --------------------------------------------------
   HANDLER → SMS ONLY
-------------------------------------------------- */
export const sendHandlerSMSAlert = async (to, text) => {
  if (!to) {
    console.warn("⚠️ Handler phone missing");
    return;
  }

  const formatted = formatSms(to);

  try {
    const msg = await client.messages.create({
      to: formatted,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      body: text,
    });
    console.log(`📲 Handler SMS sent → ${formatted}`);
    return msg.sid;
  } catch (err) {
    console.error("❌ Handler SMS failed:", err.message);
    throw err;
  }
};

export default client;

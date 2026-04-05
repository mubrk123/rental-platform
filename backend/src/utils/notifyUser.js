// 📁 src/utils/notifyUser.js
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const templates = {
  OTP: process.env.TWILIO_TEMPLATE_OTP_SID,
  BOOKING_CONFIRMATION: process.env.TWILIO_TEMPLATE_CONFIRM_SID,
  THANK_YOU: process.env.TWILIO_TEMPLATE_THANKYOU_SID,
  BOOKING_ALERT_HANDLER: process.env.TWILIO_TEMPLATE_HANDLER_SID, // ✅ new
  BOOKING_ALERT_ADMIN: process.env.TWILIO_TEMPLATE_ADMIN_SID,     // ✅ new
};

/**
 * ✅ Send WhatsApp template message via Twilio
 * @param {string} to - phone number (+91XXXXXXXXXX or 10 digits)
 * @param {string} type - template type (key from templates)
 * @param {object} vars - dynamic variables
 */
export const sendWhatsAppTemplate = async (to, type, vars = {}) => {
  try {
    if (!to) throw new Error("Recipient phone number missing");
    const formattedTo = to.startsWith("+91") ? `whatsapp:${to}` : `whatsapp:+91${to}`;

    const contentSid = templates[type];
    if (!contentSid) throw new Error(`Template not configured for type: ${type}`);

    const normalizedVars =
      type === "OTP"
        ? { "1": String(vars["1"] || vars.otp || vars.code || vars.value) }
        : Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]));

    console.log(`🟦 Sending ${type} to ${formattedTo} with vars:`, normalizedVars);

    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedTo,
      contentSid,
      contentVariables: JSON.stringify(normalizedVars),
    });

    console.log(`✅ WhatsApp ${type} sent successfully: ${msg.sid}`);
    return msg.sid;
  } catch (err) {
    console.error(`❌ WhatsApp ${type} failed:`, err.message);
    if (err.code || err.status) console.error("Twilio error details:", err);
  }
};

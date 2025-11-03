// utils/notifyUser.js
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send WhatsApp message via Twilio Sandbox
 */
export const sendWhatsApp = async (to, message) => {
  try {
    const msg = await client.messages.create({
      from: "whatsapp:+14155238886", // Twilio Sandbox number
      to: `whatsapp:+91${to}`,       // user's number (with country code)
      body: message,
    });
    console.log("✅ WhatsApp message sent:", msg.sid);
  } catch (error) {
    console.error("❌ WhatsApp message failed:", error.message);
  }
};

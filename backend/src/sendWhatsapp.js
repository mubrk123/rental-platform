import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsAppMessage(to, message) {
  try {
    const response = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`,  // e.g. whatsapp:+919876543210
      body: message,
    });
    console.log("✅ Message sent:", response.sid);
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
  }
}

sendWhatsAppMessage("+916202673708", "Hello! This is a test message from development mode.");

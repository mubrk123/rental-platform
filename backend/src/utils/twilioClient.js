import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

export const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (to, message) => {
  try {
    if (!to) throw new Error("Recipient phone number missing");
    const formattedTo = to.startsWith("+91") ? to : `+91${to}`;

    const response = await client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, // ✅ Use Messaging Service SID
      to: formattedTo,
    });

    console.log(`✅ SMS sent via Messaging Service to ${formattedTo}: ${response.sid}`);
    return response.sid;
  } catch (error) {
    console.error("❌ SMS sending failed:", error.message);
    throw error;
  }
};

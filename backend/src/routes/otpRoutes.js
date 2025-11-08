import express from "express";
import { sendWhatsAppTemplate } from "../utils/notifyUser.js";

const router = express.Router();
const otpStore = new Map();

/**
 * Send OTP via WhatsApp Template
 */
router.post("/send", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ success: false, message: "Phone number required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore.set(phoneNumber, { otp, createdAt: Date.now() });

    // ✅ Send OTP using Twilio template
    await sendWhatsAppTemplate(phoneNumber, "OTP", { 1: otp });


    res.json({ success: true, message: "OTP sent on WhatsApp successfully" });
  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP via WhatsApp" });
  }
});

/**
 * Verify OTP
 */
router.post("/verify", (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!otpStore.has(phoneNumber))
      return res.status(400).json({ success: false, message: "OTP expired or invalid" });

    const record = otpStore.get(phoneNumber);
    const isExpired = Date.now() - record.createdAt > 5 * 60 * 1000;

    if (isExpired) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (Number(otp) === record.otp) {
      otpStore.delete(phoneNumber);
      return res.json({ success: true, message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

export default router;

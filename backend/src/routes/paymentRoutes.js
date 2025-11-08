import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { sendWhatsAppTemplate } from "../utils/notifyUser.js";
import { sendEmail } from "../utils/sendEmail.js";
import { upload, uploadToCloudinary} from "../utils/upload.js"; // ✅ Cloudinary upload
import { pickupLocations } from "../utils/locationMap.js";

const router = express.Router();

/* ------------------------------------------------------------------
   CREATE RAZORPAY ORDER
------------------------------------------------------------------ */
router.post("/create-order", async (req, res) => {
  try {
    const { pricePerDay, pickupDate, dropoffDate } = req.body;

    const start = new Date(pickupDate);
    const end = new Date(dropoffDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const baseAmount = days * Number(pricePerDay || 0);

    // ✅ Include taxes (10%) and handling fee (₹10)
    const taxes = Math.round(baseAmount * 0.1);
    const handling = 10;
    const totalAmount = baseAmount + taxes + handling;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { days, pickupDate, dropoffDate, baseAmount, taxes, handling },
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error("❌ create-order error:", err);
    return res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

/* ------------------------------------------------------------------
   VERIFY PAYMENT + CREATE BOOKING + SEND EMAIL/WHATSAPP
------------------------------------------------------------------ */
router.post(
  "/verify-payment",
  upload.fields([
    { name: "aadhaarDocument", maxCount: 1 },
    { name: "licenseDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate,
        dropoffDate,
      } = req.body;

      // ✅ Verify Razorpay signature
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (expected !== razorpay_signature)
        return res.status(400).json({ success: false, message: "Invalid signature" });

      // ✅ Prevent duplicates
      const existing = await Booking.findOne({ paymentId: razorpay_payment_id });
      if (existing) return res.json({ success: true, booking: existing });

      // ✅ Upload documents to Cloudinary
      const aadhaarPath = req.files?.aadhaarDocument
        ? await uploadToCloudinary(req.files.aadhaarDocument[0], "documents")
        : null;
      const licensePath = req.files?.licenseDocument
        ? await uploadToCloudinary(req.files.licenseDocument[0], "documents")
        : null;

      // ✅ Save booking
      const newBooking = new Booking({
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate,
        dropoffDate,
        aadhaarDocument: aadhaarPath,
        licenseDocument: licensePath,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "paid",
      });
      await newBooking.save();

      // ✅ Update vehicle stock
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle) {
        vehicle.bookedQuantity = Number(vehicle.bookedQuantity || 0) + 1;
        await vehicle.save();
      }

      // ✅ Send WhatsApp Booking Confirmation Template
// ✅ Send WhatsApp Booking Confirmation Template
try {
  const locKey = city?.trim().toLowerCase();
  const locData = pickupLocations[locKey] || {};

  await sendWhatsAppTemplate(phoneNumber, "BOOKING_CONFIRMATION", {
    1: name,
    2: pickupDate,
    3: dropoffDate,
    4: city,
    5: `${locData.address || "Pickup Counter"} 📍 ${locData.link || ""}`,
    6: "+91" + phoneNumber,
    7: vehicle?.modelName || "our bike",
  });

  console.log(`✅ Booking confirmation WhatsApp sent to ${phoneNumber}`);
} catch (err) {
  console.warn("⚠️ Booking confirmation message failed:", err.message);
}


      // ✅ Send Email confirmation
      if (email) {
        try {
          await sendEmail(email, {
            name,
            bookingId: newBooking._id,
            city,
            pickupDate,
            dropoffDate,
            phoneNumber,
          });
          console.log(`✅ Email sent successfully to ${email}`);
        } catch (err) {
          console.warn("⚠️ Email sending failed:", err.message);
        }
      }


      res.json({ success: true, booking: newBooking });
    } catch (err) {
      console.error("❌ verify-payment error:", err);
      res.status(500).json({ success: false, message: "Payment verification failed" });
    }
  }
);

export default router;

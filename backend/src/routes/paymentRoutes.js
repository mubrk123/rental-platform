// paymentRoutes.js
import express from "express";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js"; // ✅ added
import { sendWhatsApp } from "../utils/notifyUser.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

/* ------------------------------------------------------------------
   MULTER SETUP
------------------------------------------------------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/documents";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({ storage });

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

      if (expected !== razorpay_signature) {
        console.error("❌ Invalid payment signature");
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }

      // ✅ Prevent duplicate booking for same payment
      const existing = await Booking.findOne({ paymentId: razorpay_payment_id });
      if (existing) {
        return res.json({ success: true, booking: existing });
      }

      // ✅ Validate essential data
      if (!userId || !vehicleId || !name || !pickupDate || !dropoffDate) {
        return res.status(400).json({ success: false, message: "Missing required booking fields" });
      }

      // ✅ File uploads
      const aadhaarPath = req.files?.aadhaarDocument
        ? `/uploads/documents/${req.files.aadhaarDocument[0].filename}`
        : null;
      const licensePath = req.files?.licenseDocument
        ? `/uploads/documents/${req.files.licenseDocument[0].filename}`
        : null;

      // compute days + amount (we trust backend calculation)
      const start = new Date(pickupDate);
      const end = new Date(dropoffDate);
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

      // Amount: try to read from order notes if available (safer), else 0
      // (Razorpay order was created earlier on frontend request)
      // We'll set amount to 0 if not provided; you may enrich this later.
      let amount = 0;
      try {
        // try parse amount from notes if needed (optional)
        // amount stays 0 unless you want to pass it explicitly
      } catch (e) {
        // ignore
      }

      // ✅ Save booking
      const newBooking = new Booking({
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate: new Date(pickupDate),
        dropoffDate: new Date(dropoffDate),
        aadhaarDocument: aadhaarPath,
        licenseDocument: licensePath,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "paid",
        days,
        amount,
      });

      await newBooking.save();

      // ✅ Update vehicle's bookedQuantity (increment)
      try {
        const vehicle = await Vehicle.findById(vehicleId);
        if (vehicle) {
          vehicle.bookedQuantity = Number(vehicle.bookedQuantity || 0) + 1;
          // Ensure bookedQuantity doesn't exceed totalQuantity
          if (vehicle.bookedQuantity > (vehicle.totalQuantity || 0)) {
            // allow it but cap to totalQuantity to avoid negatives later
            vehicle.bookedQuantity = vehicle.totalQuantity || vehicle.bookedQuantity;
          }
          await vehicle.save();
        } else {
          console.warn("⚠️ Vehicle not found for booking update:", vehicleId);
        }
      } catch (err) {
        console.error("⚠️ Failed to increment vehicle.bookedQuantity:", err);
      }

      // ✅ Send WhatsApp
      const message = `
🚲 *Booking Confirmed!*

Name: ${name}
City: ${city}
Pickup: ${pickupDate}
Dropoff: ${dropoffDate}
Vehicle ID: ${vehicleId}
      `;
      if (phoneNumber) {
        try {
          await sendWhatsApp(phoneNumber, message);
        } catch (err) {
          console.error("WhatsApp send error:", err);
        }
      }

      // ✅ Send Email (Gmail SMTP)
      if (email) {
  try {
    const vehicle = await Vehicle.findById(vehicleId);
    await sendEmail(email, {
      name,
      bookingId: newBooking._id,
      vehicleId,
      vehicleModel: vehicle?.modelName || "N/A",
      city,
      pickupDate,
      dropoffDate,
      phoneNumber,
    });
  } catch (err) {
    console.error("❌ Email send error:", err);
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

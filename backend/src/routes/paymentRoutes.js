// 📁 src/routes/paymentRoutes.js
import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { upload, uploadToCloudinary } from "../utils/upload.js";
import { pickupLocations } from "../utils/locationMap.js";
import { sendEmail } from "../utils/sendEmail.js";

// ✅ ONLY THESE NOTIFICATION FUNCTIONS
import {
  sendUserWhatsAppTemplate,
  sendAdminSMSAlert,
  sendHandlerSMSAlert,
} from "../utils/notifyUser.js";

const router = express.Router();

/* ======================================================================
   🟦 CREATE ORDER (UNCHANGED)
====================================================================== */
router.post("/create-order", async (req, res) => {
  try {
    const { pricePerDay, pickupDate, dropoffDate, helmetCount } = req.body;

    const start = new Date(pickupDate);
    const end = new Date(dropoffDate);
    const days = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    );

    const baseAmount = days * Number(pricePerDay);
    const taxes = Math.round(baseAmount * 0.18);
    const handling = 10;

    const helmetCharge = helmetCount == 2 ? 50 : 0;
    const helmetGST = helmetCount == 2 ? Math.round(50 * 0.18) : 0;

    const totalAmount =
      baseAmount + taxes + handling + helmetCharge + helmetGST;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error("❌ create-order error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order" });
  }
});

/* ======================================================================
   🟩 VERIFY PAYMENT + CREATE BOOKING + NOTIFY
====================================================================== */
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
        pickupTime,
        dropoffTime,
        helmetCount,
      } = req.body;

      // 🔐 Signature check
      const expectedSig = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid signature" });
      }

      // Prevent duplicate booking
      const existing = await Booking.findOne({
        paymentId: razorpay_payment_id,
      });
      if (existing) return res.json({ success: true, booking: existing });

      // Upload docs
      const aadhaarPath = req.files?.aadhaarDocument
        ? await uploadToCloudinary(req.files.aadhaarDocument[0], "documents")
        : null;

      const licensePath = req.files?.licenseDocument
        ? await uploadToCloudinary(req.files.licenseDocument[0], "documents")
        : null;

      // Create booking
      const booking = new Booking({
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate,
        dropoffDate,
        pickupTime,
        dropoffTime,
        helmetCount: Number(helmetCount) || 1,
        aadhaarDocument: aadhaarPath,
        licenseDocument: licensePath,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "paid",
      });

      await booking.save();

      // Update vehicle stock
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle) {
        vehicle.bookedQuantity = Number(vehicle.bookedQuantity || 0) + 1;
        await vehicle.save();
      }

      const locData = pickupLocations[city?.toLowerCase()] || {};

      /* ---------------- USER WHATSAPP ---------------- */
      await sendUserWhatsAppTemplate(phoneNumber, "BOOKING_CONFIRMATION", {
        1: name,
        2: pickupTime ? `${pickupDate} ${pickupTime}` : pickupDate,
        3: dropoffTime ? `${dropoffDate} ${dropoffTime}` : dropoffDate,
        4: city,
        5: `${locData.address || "Pickup Counter"} ${locData.link || ""}`,
        6: locData.handlerPhone || process.env.DEFAULT_HANDLER_NUMBER,
        7: vehicle?.modelName || "Bike",
      });

      /* ---------------- ADMIN SMS ---------------- */
      await sendAdminSMSAlert(
        `New booking confirmed
Location: ${city}
Customer: ${name}
Phone: ${phoneNumber}
Vehicle: ${vehicle?.brand || ""} ${vehicle?.modelName || ""}
Pickup: ${pickupTime ? `${pickupDate} ${pickupTime}` : pickupDate}
Dropoff: ${dropoffTime ? `${dropoffDate} ${dropoffTime}` : dropoffDate}
Handler: ${locData.handlerPhone || "N/A"}`
      );

      /* ---------------- HANDLER SMS ---------------- */
      if (locData.handlerPhone) {
        await sendHandlerSMSAlert(
          locData.handlerPhone,
          `New booking for ${city}
Customer: ${name}
Phone: ${phoneNumber}
Vehicle: ${vehicle?.brand || ""} ${vehicle?.modelName || ""}
Pickup: ${pickupTime ? `${pickupDate} ${pickupTime}` : pickupDate}
Dropoff: ${dropoffTime ? `${dropoffDate} ${dropoffTime}` : dropoffDate}`
        );
      }

      /* ---------------- EMAIL ---------------- */
      if (email) {
        await sendEmail(email, {
          name,
          bookingId: booking.bookingId || booking._id.toString(),
          city,
          pickupDate,
          dropoffDate,
          pickupTime,
          dropoffTime,
          phoneNumber,
        });
      }

      return res.json({ success: true, booking });
    } catch (err) {
      console.error("❌ verify-payment error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Payment verification failed" });
    }
  }
);

export default router;

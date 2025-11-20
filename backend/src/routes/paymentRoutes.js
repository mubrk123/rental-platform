// 📁 src/routes/paymentRoutes.js
import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { sendWhatsAppTemplate } from "../utils/notifyUser.js";
import { sendEmail } from "../utils/sendEmail.js";
import { upload, uploadToCloudinary } from "../utils/upload.js";
import { pickupLocations } from "../utils/locationMap.js";

const router = express.Router();

/* ======================================================================
    🟦 CREATE RAZORPAY ORDER (NOW WITH HELMET CHARGES)
====================================================================== */
router.post("/create-order", async (req, res) => {
  try {
    const { pricePerDay, pickupDate, dropoffDate, helmetCount } = req.body;

    // ----------------------------
    // 1. Calculate number of days
    // ----------------------------
    const start = new Date(pickupDate);
    const end = new Date(dropoffDate);
    const days = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    );

    // ----------------------------
    // 2. Base rental amount
    // ----------------------------
    const baseAmount = days * Number(pricePerDay);
    const taxes = Math.round(baseAmount * 0.18);
    const handling = 10;

    // ----------------------------
    // ⭐ 3. Helmet charges
    // ----------------------------
    const helmetCharge = helmetCount == 2 ? 50 : 0;
    const helmetGST = helmetCount == 2 ? Math.round(50 * 0.18) : 0;

    // ----------------------------
    // 4. Final amount (to Razorpay)
    // ----------------------------
    const totalAmount =
      baseAmount + taxes + handling + helmetCharge + helmetGST;

    console.log("🔵 Calculated Amount:", {
      baseAmount,
      taxes,
      handling,
      helmetCharge,
      helmetGST,
      totalAmount,
    });

    // ----------------------------
    // 5. Create Razorpay order
    // ----------------------------
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        days,
        pickupDate,
        dropoffDate,
        baseAmount,
        taxes,
        handling,
        helmetCount,
        helmetCharge,
        helmetGST,
      },
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error("❌ create-order error:", err);
    return res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

/* ======================================================================
    🟩 VERIFY PAYMENT + CREATE BOOKING (NOW SAVES HELMET COUNT)
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
        helmetCount, // ⭐ added
      } = req.body;

      /* ------------------------------------
            SIGNATURE VERIFICATION
      ------------------------------------ */
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expected !== razorpay_signature)
        return res.status(400).json({
          success: false,
          message: "Invalid signature",
        });

      /* ------------------------------------
            PREVENT DUPLICATE BOOKINGS
      ------------------------------------ */
      const existing = await Booking.findOne({
        paymentId: razorpay_payment_id,
      });

      if (existing) return res.json({ success: true, booking: existing });

      /* ------------------------------------
            UPLOAD DOCUMENTS TO CLOUDINARY
      ------------------------------------ */
      const aadhaarPath = req.files?.aadhaarDocument
        ? await uploadToCloudinary(req.files.aadhaarDocument[0], "documents")
        : null;

      const licensePath = req.files?.licenseDocument
        ? await uploadToCloudinary(req.files.licenseDocument[0], "documents")
        : null;

      /* ------------------------------------
           CREATE BOOKING IN DATABASE
      ------------------------------------ */
      const newBooking = new Booking({
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate,
        dropoffDate,
        helmetCount: Number(helmetCount) || 1, // ⭐ save helmet count
        aadhaarDocument: aadhaarPath,
        licenseDocument: licensePath,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "paid",
      });

      await newBooking.save();

      /* ------------------------------------
           UPDATE VEHICLE STOCK
      ------------------------------------ */
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle) {
        vehicle.bookedQuantity = Number(vehicle.bookedQuantity || 0) + 1;
        await vehicle.save();
      }

      /* ------------------------------------
           SEND WHATSAPP CONFIRMATION TO USER
      ------------------------------------ */
      try {
        const locKey = city?.toLowerCase().trim();
        const locData = pickupLocations[locKey] || {};

        await sendWhatsAppTemplate(phoneNumber, "BOOKING_CONFIRMATION", {
          1: name,
          2: pickupDate,
          3: dropoffDate,
          4: city,
          5: `${locData.address || "Pickup Counter"} ${locData.link || ""}`,
          6: locData.handlerPhone || process.env.DEFAULT_HANDLER_NUMBER,
          7: vehicle?.modelName || "Bike",
        });
      } catch (err) {
        console.log("⚠️ WhatsApp send error:", err.message);
      }

      /* ------------------------------------
            EMAIL CONFIRMATION
      ------------------------------------ */
      if (email) {
        try {
          await sendEmail(email, {
            name,
            bookingId: newBooking._id,
            city,
            pickupDate,
            dropoffDate,
            phoneNumber,
            helmetCount,
          });
        } catch (err) {
          console.log("⚠️ Email error:", err.message);
        }
      }

      res.json({ success: true, booking: newBooking });
    } catch (err) {
      console.error("❌ verify-payment error:", err);
      res.status(500).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  }
);

export default router;

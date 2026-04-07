// 📁 src/routes/paymentRoutes.js
import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { sendWhatsAppTemplate } from "../utils/notifyUser.js";
import { sendSMS } from "../utils/twilioClient.js";
import { sendEmail } from "../utils/sendEmail.js";
import { upload, uploadToCloudinary } from "../utils/upload.js";
import Location from "../models/Location.js";

// Format date+time as "10 Apr 2026, 10:00 AM"
const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return "N/A";
  const combined = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
  const d = new Date(combined);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const router = express.Router();

/* ======================================================================
    🟦 CREATE RAZORPAY ORDER
====================================================================== */
router.post("/create-order", async (req, res) => {
  try {
    const { pricePerDay, pickupDate, pickupTime, dropoffDate, dropoffTime, helmetCount } = req.body;

    const start = new Date(`${pickupDate}T${pickupTime || "00:00"}:00`);
    const end = new Date(`${dropoffDate}T${dropoffTime || "00:00"}:00`);
    const minutes = Math.max(1, Math.ceil((end - start) / 60000));
    const days = Math.ceil(minutes / 1440) || 1;

    const baseAmount = days * Number(pricePerDay);
    const taxes = Math.round(baseAmount * 0.18);
    const handling = 10;
    const helmetCharge = helmetCount == 2 ? 50 : 0;
    const helmetGST = helmetCount == 2 ? Math.round(50 * 0.18) : 0;
    const totalAmount = baseAmount + taxes + handling + helmetCharge + helmetGST;

    console.log("🔵 Calculated Amount:", { days, baseAmount, taxes, handling, helmetCharge, helmetGST, totalAmount });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { days, pickupDate, pickupTime, dropoffDate, dropoffTime, baseAmount, taxes, handling, helmetCount, helmetCharge, helmetGST },
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error("❌ create-order error:", err);
    return res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

/* ======================================================================
    🟩 VERIFY PAYMENT + CREATE BOOKING
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
        pickupTime,
        dropoffDate,
        dropoffTime,
        helmetCount,
      } = req.body;

      /* SIGNATURE VERIFICATION */
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expected !== razorpay_signature)
        return res.status(400).json({ success: false, message: "Invalid signature" });

      /* PREVENT DUPLICATE BOOKINGS */
      const existing = await Booking.findOne({ paymentId: razorpay_payment_id });
      if (existing) return res.json({ success: true, booking: existing });

      /* UPLOAD DOCUMENTS TO CLOUDINARY */
      const aadhaarPath = req.files?.aadhaarDocument
        ? await uploadToCloudinary(req.files.aadhaarDocument[0], "documents")
        : null;

      const licensePath = req.files?.licenseDocument
        ? await uploadToCloudinary(req.files.licenseDocument[0], "documents")
        : null;

      /* FETCH PAID AMOUNT FROM RAZORPAY */
      let paidAmount = 0;
      try {
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const order = await razorpay.orders.fetch(razorpay_order_id);
        paidAmount = Math.round((order.amount || 0) / 100);
      } catch (err) {
        console.warn("⚠️ Could not fetch order amount:", err.message);
      }

      /* CREATE BOOKING */
      const newBooking = new Booking({
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate,
        pickupTime: pickupTime || "00:00",
        dropoffDate,
        dropoffTime: dropoffTime || "00:00",
        helmetCount: Number(helmetCount) || 1,
        aadhaarDocument: aadhaarPath,
        licenseDocument: licensePath,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: paidAmount,
        status: "paid",
      });

      await newBooking.save();

      /* UPDATE VEHICLE STOCK */
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle) {
        vehicle.bookedQuantity = Number(vehicle.bookedQuantity || 0) + 1;
        await vehicle.save();
      }

      /* SEND ALL NOTIFICATIONS IN PARALLEL */
      const locData = await Location.findOne({
        name: { $regex: new RegExp(`^${city}`, "i") },
      }).lean();

      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.modelName}` : "N/A";
      const pickupFormatted = formatDateTime(pickupDate, pickupTime);
      const dropoffFormatted = formatDateTime(dropoffDate, dropoffTime);

      await Promise.allSettled([
        // WhatsApp to user
        sendWhatsAppTemplate(phoneNumber, "BOOKING_CONFIRMATION", {
          1: name,
          2: pickupFormatted,
          3: dropoffFormatted,
          4: city,
          5: `${locData?.address || "Pickup Counter"} ${locData?.mapsLink || ""}`,
          6: locData?.handlerPhone || process.env.DEFAULT_HANDLER_NUMBER,
          7: vehicle?.modelName || "Bike",
        }).catch((err) => console.warn("⚠️ WhatsApp failed:", err.message)),

        // Email to user
        email
          ? sendEmail(email, {
              name,
              bookingId: newBooking._id,
              city,
              pickupDate,
              pickupTime,
              dropoffDate,
              dropoffTime,
              phoneNumber,
              helmetCount,
            }).catch((err) => console.warn("⚠️ Email failed:", err.message))
          : Promise.resolve(),

        // SMS to main admin
        sendSMS(
          process.env.MAIN_ADMIN_NUMBER,
          [
            `NEW BOOKING - NewBikeWorld`,
            `----------------------------`,
            `Name   : ${name}`,
            `Phone  : ${phoneNumber}`,
            `Vehicle: ${vehicleName}`,
            `Branch : ${locData?.name || city}`,
            `Handler: ${locData?.handlerPhone || "N/A"}`,
            `----------------------------`,
            `Pickup : ${pickupFormatted}`,
            `Return : ${dropoffFormatted}`,
            `Amount : Rs.${paidAmount} (PAID)`,
          ].join("\n")
        ).catch((err) => console.warn("⚠️ Admin SMS failed:", err.message)),

        // SMS to branch handler
        locData?.handlerPhone
          ? sendSMS(
              locData.handlerPhone,
              [
                `NEW BOOKING - Your Branch`,
                `----------------------------`,
                `Name   : ${name}`,
                `Phone  : ${phoneNumber}`,
                `Vehicle: ${vehicleName}`,
                `----------------------------`,
                `Pickup : ${pickupFormatted}`,
                `Return : ${dropoffFormatted}`,
                `Amount : Rs.${paidAmount} (PAID)`,
              ].join("\n")
            ).catch((err) => console.warn("⚠️ Handler SMS failed:", err.message))
          : Promise.resolve(),
      ]);

      console.log("✅ All notifications dispatched");

      res.json({ success: true, booking: newBooking });
    } catch (err) {
      console.error("❌ verify-payment error:", err);
      res.status(500).json({ success: false, message: "Payment verification failed" });
    }
  }
);

export default router;

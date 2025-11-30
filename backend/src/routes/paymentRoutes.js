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

// ⭐ import these alert functions from bookingRoutes.js file
import {
  sendAdminAlert,
  sendHandlerAlert,
} from "../utils/notifyUser.js";

const router = express.Router();

/* ======================================================================
    🟦 CREATE ORDER (with helmet charges)
====================================================================== */
router.post("/create-order", async (req, res) => {
  try {
    const { pricePerDay, pickupDate, dropoffDate, helmetCount } = req.body;

    const start = new Date(pickupDate);
    const end = new Date(dropoffDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    const baseAmount = days * Number(pricePerDay);
    const taxes = Math.round(baseAmount * 0.18);
    const handling = 10;

    const helmetCharge = helmetCount == 2 ? 50 : 0;
    const helmetGST = helmetCount == 2 ? Math.round(50 * 0.18) : 0;

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
    🟩 VERIFY PAYMENT + CREATE BOOKING + SEND ALERTS
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
        helmetCount,
      } = req.body;

      // ------------------------------- Signature Check -------------------------------
      const expectedSig = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSig !== razorpay_signature)
        return res
          .status(400)
          .json({ success: false, message: "Invalid signature" });

      // Prevent duplicate booking
      const existing = await Booking.findOne({
        paymentId: razorpay_payment_id,
      });
      if (existing) return res.json({ success: true, booking: existing });

      // ------------------------------- Upload Docs -------------------------------
      const aadhaarPath = req.files?.aadhaarDocument
        ? await uploadToCloudinary(req.files.aadhaarDocument[0], "documents")
        : null;

      const licensePath = req.files?.licenseDocument
        ? await uploadToCloudinary(req.files.licenseDocument[0], "documents")
        : null;

      // ------------------------------- Create Booking -------------------------------
      const newBooking = new Booking({
        userId,
        vehicleId,
        name,
        email,
        phoneNumber,
        city,
        pickupDate,
        dropoffDate,
        helmetCount: Number(helmetCount) || 1,
        aadhaarDocument: aadhaarPath,
        licenseDocument: licensePath,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "paid",
      });

      await newBooking.save();

      // ------------------------------- Update Stock -------------------------------
      const vehicle = await Vehicle.findById(vehicleId);
      if (vehicle) {
        vehicle.bookedQuantity = Number(vehicle.bookedQuantity || 0) + 1;
        await vehicle.save();
      }

     /* ------------------------------------
   SEND USER WHATSAPP CONFIRMATION
------------------------------------ */
try {
  const locData = pickupLocations[city?.toLowerCase()] || {};

  await sendWhatsAppTemplate(phoneNumber, "BOOKING_CONFIRMATION", {
    1: name,
    2: pickupDate,
    3: dropoffDate,
    4: city,
    5: `${locData.address || "Pickup Counter"} ${locData.link || ""}`,
    6: locData.handlerPhone || process.env.DEFAULT_HANDLER_NUMBER,
    7: vehicle?.modelName || "Bike",
  });
  console.log("📩 User booking WA sent");
} catch (err) {
  console.log("⚠️ User WA error:", err.message);
}

/* ------------------------------------
   SEND ADMIN ALERT WITH PHONE NUMBER
------------------------------------ */
/* ------------------------------------
   SEND ADMIN ALERT — MATCHES TEMPLATE
------------------------------------ */
try {
  await sendAdminAlert({
    vars: {
      1: city,                                                                   // Location
      2: name,                                                                   // Customer
      3: phoneNumber,                                                            // Phone
      4: email || "N/A",                                                         // Email
      5: `${vehicle?.brand} ${vehicle?.modelName}`,                              // Vehicle
      6: pickupDate,                                                             // Pickup
      7: dropoffDate,                                                            // Dropoff
      8: pickupLocations[city?.toLowerCase()]?.handlerPhone || "N/A",           // Handler phone
    },
    text: `New booking confirmed!
Location: ${city}
Customer: ${name}
Phone: ${phoneNumber}
Email: ${email}
Vehicle: ${vehicle?.brand} ${vehicle?.modelName}
Pickup: ${pickupDate}
Dropoff: ${dropoffDate}
Handler: ${pickupLocations[city?.toLowerCase()]?.handlerPhone || "N/A"}`
  });

  console.log("📨 Admin booking alert sent");
} catch (err) {
  console.warn("⚠️ Admin alert failed:", err.message);
}

/* ------------------------------------
   SEND HANDLER ALERT — MATCHES TEMPLATE
------------------------------------ */
try {
  const handlerPhone = pickupLocations[city?.toLowerCase()]?.handlerPhone;

  await sendHandlerAlert({
    phone: handlerPhone,
    vars: {
      1: city,                               // Location
      2: name,                               // Customer
      3: phoneNumber,                        // Phone
      4: email || "N/A",                     // Email
      5: `${vehicle?.brand} ${vehicle?.modelName}`,   // Vehicle
      6: pickupDate,                         // Pickup
      7: dropoffDate,                        // Dropoff
    },
    text: `New booking received for ${city} branch!
Customer: ${name}
Phone: ${phoneNumber}
Email: ${email}
Vehicle: ${vehicle?.brand} ${vehicle?.modelName}
Pickup: ${pickupDate}
Dropoff: ${dropoffDate}`
  });

  console.log("📨 Handler booking alert sent");
} catch (err) {
  console.warn("⚠️ Handler alert failed:", err.message);
}


      /* ======================================================================
            EMAIL CONFIRMATION
      ====================================================================== */
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
        } catch (err) {
          console.log("⚠️ Email error:", err.message);
        }
      }

      return res.json({ success: true, booking: newBooking });
    } catch (err) {
      console.error("❌ verify-payment error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Payment verification failed" });
    }
  }
);

export default router;

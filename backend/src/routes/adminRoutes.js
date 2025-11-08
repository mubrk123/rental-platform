// routes/adminRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { verifyAdmin } from "../middleware/adminAuth.js"; // ✅ we'll use central middleware

dotenv.config();
const router = express.Router();

/* ------------------------------------------------------------------
   🚫 RATE LIMITER for login route (prevents brute-force)
------------------------------------------------------------------ */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: "Too many login attempts. Please try again after 10 minutes.",
});

/* ------------------------------------------------------------------
   🟢 ADMIN LOGIN ROUTE (Main Admin vs Pickup Handler)
------------------------------------------------------------------ */
router.post("/login", loginLimiter, (req, res) => {
  try {
    const { email, password } = req.body;

    // 🧠 CASE 1 — Main Admin Login
    if (
      email === process.env.MAIN_ADMIN_EMAIL &&
      password === process.env.MAIN_ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { role: "admin", isMainAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        success: true,
        token,
        message: "Main admin login successful",
      });
    }

    // 🧠 CASE 2 — Pickup Handler Login
    if (
      email === process.env.HANDLER_EMAIL &&
      password === process.env.HANDLER_PASSWORD
    ) {
      const token = jwt.sign(
        { role: "admin", isMainAdmin: false },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        success: true,
        token,
        message: "Handler login successful",
      });
    }

    // ❌ CASE 3 — Invalid credentials
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
  } catch (err) {
    console.error("Admin login error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
});

/* ------------------------------------------------------------------
   🧩 JWT VERIFICATION MIDDLEWARE (kept here for reference)
------------------------------------------------------------------ */
const verifyAdminInline = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "Missing authorization header" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Forbidden: Not an admin" });

    req.admin = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res
      .status(401)
      .json({ error: "Invalid or expired token. Please log in again." });
  }
};

/* ------------------------------------------------------------------
   🟣 DASHBOARD ANALYTICS ROUTE (Protected - All Admins)
------------------------------------------------------------------ */
router.get("/stats", verifyAdminInline, async (req, res) => {
  try {
    const today = dayjs().startOf("day");
    const startOfMonth = dayjs().startOf("month");

    // 1️⃣ Today's Pickups
    const todaysPickups = await Booking.countDocuments({
      pickupDate: { $gte: today.toDate(), $lt: dayjs(today).add(1, "day").toDate() },
    });

    // 2️⃣ Pending Bookings
    const pendingBookings = await Booking.countDocuments({ status: "pending" });

    // 3️⃣ Active Vehicles
    const activeVehicles = await Vehicle.countDocuments({});

    // 4️⃣ Total Revenue (for current month)
    const revenueThisMonth = await Booking.aggregate([
      {
        $match: {
          status: "completed",
          dropoffDate: { $gte: startOfMonth.toDate() },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueThisMonth[0]?.total || 0;

    // 5️⃣ Recent Bookings
    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("vehicleId", "modelName")
      .populate("userId", "name email");

    return res.status(200).json({
      todaysPickups,
      pendingBookings,
      activeVehicles,
      totalRevenue,
      recentBookings,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin stats. Please try again." });
  }
});

export default router;

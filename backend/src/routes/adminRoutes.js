// routes/adminRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import AdminCredentials from "../models/AdminCredentials.js";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { verifyMainAdmin } from "../middleware/adminAuth.js";

dotenv.config();
const router = express.Router();

/* ------------------------------------------------------------------
   🚫 RATE LIMITER
------------------------------------------------------------------ */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again after 10 minutes.",
});

/* ------------------------------------------------------------------
   🟢 ADMIN LOGIN — checks DB credentials
------------------------------------------------------------------ */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const cred = await AdminCredentials.findOne({ email: email.toLowerCase().trim() });
    if (!cred)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    const match = await bcrypt.compare(password, cred.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign(
      { role: "admin", isMainAdmin: cred.role === "mainAdmin", locationId: cred.locationId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({ success: true, token, message: `${cred.role === "mainAdmin" ? "Main admin" : "Handler"} login successful` });
  } catch (err) {
    console.error("Admin login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});

/* ------------------------------------------------------------------
   🔑 GET ALL CREDENTIALS (emails + locationName, no passwords)
------------------------------------------------------------------ */
router.get("/credentials", verifyMainAdmin, async (req, res) => {
  try {
    const creds = await AdminCredentials.find()
      .select("role email locationId locationName createdAt")
      .sort({ role: -1, locationName: 1 })
      .lean();
    res.json({ success: true, credentials: creds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------------------
   🔑 UPDATE CREDENTIAL BY ID
------------------------------------------------------------------ */
router.put("/credentials/:id", verifyMainAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email && !password)
      return res.status(400).json({ success: false, message: "Provide email or password to update" });

    const update = {};
    if (email) update.email = email.toLowerCase().trim();
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      update.password = await bcrypt.hash(password, 10);
    }

    const cred = await AdminCredentials.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select("role email locationName");

    if (!cred)
      return res.status(404).json({ success: false, message: "Credential not found" });

    res.json({ success: true, message: "Credentials updated successfully", credential: cred });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------------------
   🧩 JWT VERIFICATION MIDDLEWARE (inline, for stats route)
------------------------------------------------------------------ */
const verifyAdminInline = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Forbidden: Not an admin" });
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
};

/* ------------------------------------------------------------------
   🟣 DASHBOARD ANALYTICS
------------------------------------------------------------------ */
router.get("/stats", verifyAdminInline, async (req, res) => {
  try {
    const today = dayjs().startOf("day");
    const startOfMonth = dayjs().startOf("month");

    const todaysPickups = await Booking.countDocuments({
      pickupDate: { $gte: today.toDate(), $lt: dayjs(today).add(1, "day").toDate() },
    });
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const activeVehicles = await Vehicle.countDocuments({});
    const revenueThisMonth = await Booking.aggregate([
      { $match: { status: "completed", dropoffDate: { $gte: startOfMonth.toDate() } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueThisMonth[0]?.total || 0;
    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("vehicleId", "modelName")
      .populate("userId", "name email");

    return res.status(200).json({ todaysPickups, pendingBookings, activeVehicles, totalRevenue, recentBookings });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ error: "Failed to fetch admin stats. Please try again." });
  }
});

export default router;

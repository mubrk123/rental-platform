// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------
//  Load Environment Variables
// ---------------------------------------------
dotenv.config();

// ---------------------------------------------
//  Setup __dirname for ES Modules
// ---------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------
//  Initialize Express App
// ---------------------------------------------
const app = express();

// ---------------------------------------------
//  Middleware Configuration
// ---------------------------------------------
//import helmet from "helmet";

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


app.use(compression()); // gzip compress responses
app.use(morgan("dev")); // simple request logging

const allowedOrigins = [
  "http://localhost:5173",
  "https://www.newbikeworld.in",
  "https://newbikeworld.in"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-secret"],
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Serve uploaded files statically (vehicles + documents + PDFs)
//app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ---------------------------------------------
//  MongoDB Connection
// ---------------------------------------------
// ---------------------------------------------
//  MongoDB Connection
// ---------------------------------------------
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rentalDB";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    console.log("🧩 Connected to DB:", mongoose.connection.name);
    await seedLocations();
    await seedAdminCredentials();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // exit if DB fails to connect
  });

// ---------------------------------------------
//  Routes
// ---------------------------------------------
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import saleBikeRoutes from "./routes/saleBikeRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import { seedLocations } from "./utils/seedLocations.js";
import { seedAdminCredentials } from "./utils/seedAdminCredentials.js";

app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/sale-bikes", saleBikeRoutes);
app.use("/api/locations", locationRoutes);

// ---------------------------------------------
//  Health Check Endpoint
// ---------------------------------------------
app.get("/", (req, res) => {
  res.status(200).send("🚀 Rental Web Backend is Running Successfully!");
});

// ---------------------------------------------
//  404 Handler
// ---------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------------------------------------
//  Global Error Handler (final catch-all)
// ---------------------------------------------
app.use((err, req, res, next) => {
  console.error("💥 Server error:", err.stack || err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ---------------------------------------------
//  Start Server
// ---------------------------------------------
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚗 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

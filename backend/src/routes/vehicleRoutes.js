// vehicleRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js"; // ✅ added

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../../uploads/vehicles")),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage });

// ✅ POST /api/vehicles — Upload new vehicle
router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    const { modelName, brand, rentPerDay, totalQuantity, city, type } = req.body;
    const imagePaths = req.files.map(
      (file) => `uploads/vehicles/${file.filename}`
    );

    const newVehicle = new Vehicle({
      modelName,
      brand,
      rentPerDay,
      totalQuantity,
      location: { city },
      type,
      images: imagePaths,
      bookedQuantity: 0,
    });

    await newVehicle.save();
    res.status(201).json({
      success: true,
      message: "✅ Vehicle uploaded successfully",
      vehicle: newVehicle,
    });
  } catch (error) {
    console.error("Error uploading vehicle:", error);
    res.status(500).json({ message: "Error uploading vehicle" });
  }
});

// ✅ GET /api/vehicles (optional ?city=)
router.get("/", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const city = req.query.city;
    const query = city ? { "location.city": city } : {};
    const vehicles = await Vehicle.find(query).lean();

    const formattedVehicles = vehicles.map((v) => ({
      ...v,
      images: v.images?.map((img) =>
        img.startsWith("uploads/")
          ? `${baseUrl}/${img.replace(/\\/g, "/")}`
          : img
      ),
      availableCount: Math.max(
        0,
        (v.totalQuantity || 0) - (v.bookedQuantity || 0)
      ),
    }));

    res.json(formattedVehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Error fetching vehicles" });
  }
});

// ✅ GET /api/vehicles/:id
router.get("/:id", async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const formatted = {
      ...v.toObject(),
      images: v.images?.map((img) =>
        img.startsWith("uploads/")
          ? `${baseUrl}/${img.replace(/\\/g, "/")}`
          : img
      ),
      availableCount: Math.max(
        0,
        (v.totalQuantity || 0) - (v.bookedQuantity || 0)
      ),
    };

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching vehicle:", err);
    res.status(500).json({ message: "Error fetching vehicle", error: err.message });
  }
});

// ✅ GET upcoming bookings for a vehicle
router.get("/:id/bookings/upcoming", async (req, res) => {
  try {
    const now = new Date();
    const vehicleId = req.params.id;

    const bookings = await Booking.find({
      vehicleId,
      pickupDate: { $gte: now },
      status: { $ne: "completed" },
    })
      .sort({ pickupDate: 1 })
      .limit(5)
      .lean();

    res.json(bookings);
  } catch (err) {
    console.error("Error fetching upcoming bookings:", err);
    res.status(500).json({ message: "Failed to fetch upcoming bookings" });
  }
});

// ✅ DELETE /api/vehicles/:id
router.delete("/:id", async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ message: "Error deleting vehicle" });
  }
});

// ✅ PUT /api/vehicles/:id — Update existing vehicle
router.put("/:id", async (req, res) => {
  try {
    const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, vehicle: updated });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

export default router;

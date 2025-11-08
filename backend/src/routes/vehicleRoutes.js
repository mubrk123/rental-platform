// routes/vehicleRoutes.js
import express from "express";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import { upload, uploadToCloudinary, cloudinary } from "../utils/upload.js";
import { verifyMainAdmin } from "../middleware/adminAuth.js"; // ✅ for restricted routes

const router = express.Router();

/* --------------------------------------------------------------------------
 * 🆕 POST /api/vehicles — Upload new vehicle (Main Admin only)
 * -------------------------------------------------------------------------- */
router.post("/", verifyMainAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const { modelName, brand, rentPerDay, totalQuantity, city, type } = req.body;

    if (!modelName || !brand || !rentPerDay || !city) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Upload images to Cloudinary
    const imageUrls = await Promise.all(
      req.files.map((f) => uploadToCloudinary(f.buffer, "vehicles"))
    );

    const newVehicle = new Vehicle({
      modelName,
      brand,
      rentPerDay,
      totalQuantity,
      location: { city },
      type: type?.toLowerCase(),
      images: imageUrls,
      bookedQuantity: 0,
    });

    await newVehicle.save();
    res.status(201).json({
      success: true,
      message: "✅ Vehicle uploaded successfully to Cloudinary",
      vehicle: newVehicle,
    });
  } catch (error) {
    console.error("❌ Error uploading vehicle:", error);
    res.status(500).json({ message: "Error uploading vehicle" });
  }
});

/* --------------------------------------------------------------------------
 * 📋 GET /api/vehicles — Get all vehicles (optional ?city=)
 * -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const city = req.query.city;
    const query = city ? { "location.city": city } : {};
    const vehicles = await Vehicle.find(query).lean();

    const formattedVehicles = vehicles.map((v) => ({
      ...v,
      availableCount: Math.max(
        0,
        (v.totalQuantity || 0) - (v.bookedQuantity || 0)
      ),
    }));

    res.json(formattedVehicles);
  } catch (error) {
    console.error("❌ Error fetching vehicles:", error);
    res.status(500).json({ message: "Error fetching vehicles" });
  }
});

/* --------------------------------------------------------------------------
 * 📄 GET /api/vehicles/:id — Get a specific vehicle
 * -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    const formatted = {
      ...v.toObject(),
      availableCount: Math.max(
        0,
        (v.totalQuantity || 0) - (v.bookedQuantity || 0)
      ),
    };

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error fetching vehicle:", err);
    res.status(500).json({ message: "Error fetching vehicle", error: err.message });
  }
});

/* --------------------------------------------------------------------------
 * 🚗 GET /api/vehicles/:id/bookings/upcoming — Upcoming bookings for vehicle
 * -------------------------------------------------------------------------- */
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
    console.error("❌ Error fetching upcoming bookings:", err);
    res.status(500).json({ message: "Failed to fetch upcoming bookings" });
  }
});

/* --------------------------------------------------------------------------
 * ✏️ PUT /api/vehicles/:id — Update vehicle (Main Admin only)
 * -------------------------------------------------------------------------- */
router.put("/:id", verifyMainAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { modelName, brand, rentPerDay, totalQuantity, city, type } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    // ✅ Update fields
    vehicle.modelName = modelName || vehicle.modelName;
    vehicle.brand = brand || vehicle.brand;
    vehicle.rentPerDay = rentPerDay || vehicle.rentPerDay;
    vehicle.totalQuantity = totalQuantity || vehicle.totalQuantity;
    vehicle.type = type ? type.toLowerCase() : vehicle.type;
    vehicle.location = { city: city || vehicle.location?.city };

    // ✅ New images (replace old)
    if (req.files && req.files.length > 0) {
      const newUrls = await Promise.all(
        req.files.map((f) => uploadToCloudinary(f.buffer, "vehicles"))
      );
      vehicle.images = newUrls;
    }

    await vehicle.save();

    res.json({
      success: true,
      message: "✅ Vehicle updated successfully",
      vehicle,
    });
  } catch (err) {
    console.error("❌ Vehicle update failed:", err);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
});

/* --------------------------------------------------------------------------
 * 🗑️ DELETE /api/vehicles/:id — Delete vehicle (Main Admin only)
 * -------------------------------------------------------------------------- */
router.delete("/:id", verifyMainAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    // ✅ Delete Cloudinary images
    for (const url of vehicle.images || []) {
      try {
        const parts = url.split("/");
        const publicId = parts.slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn("⚠️ Failed to delete Cloudinary file:", e.message);
      }
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "✅ Vehicle deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting vehicle:", error);
    res.status(500).json({ message: "Error deleting vehicle" });
  }
});

export default router;

// routes/vehicleRoutes.js
import express from "express";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
//import { upload } from "../utils/upload.js"; // ✅ Cloudinary-based multer
import { upload, uploadToCloudinary } from "../utils/upload.js";
 // for deleting files if needed

const router = express.Router();

/**
 * ✅ POST /api/vehicles
 * Upload new vehicle directly to Cloudinary
 */
router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    const { modelName, brand, rentPerDay, totalQuantity, city, type } = req.body;

    // ✅ Cloudinary automatically returns URLs in file.path
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

/**
 * ✅ GET /api/vehicles (optional ?city=)
 */
router.get("/", async (req, res) => {
  try {
    const city = req.query.city;
    const query = city ? { "location.city": city } : {};
    const vehicles = await Vehicle.find(query).lean();

    const formattedVehicles = vehicles.map((v) => ({
      ...v,
      images: v.images, // already Cloudinary URLs
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

/**
 * ✅ GET /api/vehicles/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    const formatted = {
      ...v.toObject(),
      images: v.images,
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

/**
 * ✅ GET upcoming bookings for a vehicle
 */
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

/**
 * ✅ DELETE /api/vehicles/:id
 * Deletes vehicle and Cloudinary images
 */
router.delete("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    // ✅ delete Cloudinary files
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

/**
 * ✅ PUT /api/vehicles/:id — Update existing vehicle
 */
/**
 * ✅ PUT /api/vehicles/:id — Update existing vehicle with Cloudinary support
 */
router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { modelName, brand, rentPerDay, totalQuantity, city, type } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    // ✅ Update basic fields
    vehicle.modelName = modelName || vehicle.modelName;
    vehicle.brand = brand || vehicle.brand;
    vehicle.rentPerDay = rentPerDay || vehicle.rentPerDay;
    vehicle.totalQuantity = totalQuantity || vehicle.totalQuantity;
    vehicle.type = type ? type.toLowerCase() : vehicle.type;
    vehicle.location = { city: city || vehicle.location?.city };

    // ✅ Handle new image uploads if provided
    if (req.files && req.files.length > 0) {
      const newUrls = await Promise.all(
        req.files.map((f) => uploadToCloudinary(f.buffer, "vehicles"))
      );
      vehicle.images = newUrls; // Replace all existing images
    }

    await vehicle.save();

    const updatedVehicle = vehicle.toObject();
    updatedVehicle.availableCount = Math.max(
      0,
      (vehicle.totalQuantity || 0) - (vehicle.bookedQuantity || 0)
    );

    res.json({
      success: true,
      message: "✅ Vehicle updated successfully",
      vehicle: updatedVehicle,
    });
  } catch (err) {
    console.error("❌ Vehicle update failed:", err);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
});

export default router;

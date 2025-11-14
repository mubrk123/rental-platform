// routes/saleBikeRoutes.js
import express from "express";
import SaleBike from "../models/SaleBike.js";
import { upload, uploadToCloudinary, cloudinary } from "../utils/upload.js";
import { verifyMainAdmin } from "../middleware/adminAuth.js"; // ✅ Now self-sufficient middleware

const router = express.Router();

/* --------------------------------------------------------------------------
 * 🆕 POST /api/sale-bikes — Create new sale bike (Main Admin only)
 * -------------------------------------------------------------------------- */
router.post("/", verifyMainAdmin, upload.array("images", 10), async (req, res) => {
  try {
    const { modelName, brand, price, description, year, mileage, condition, city } = req.body;

    if (!modelName || !brand || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (modelName, brand, price)",
      });
    }

    // ✅ Upload all images to Cloudinary
    const imagePaths = await Promise.all(
      req.files.map((f) => uploadToCloudinary(f.buffer, "sale-bikes"))
    );

    if (imagePaths.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least 3 images.",
      });
    }

    // ✅ Create new sale bike entry
    const saleBike = new SaleBike({
      modelName,
      brand,
      price: Number(price),
      description: description || "",
      year: year ? Number(year) : undefined,
      mileage: mileage || "",
      condition: condition || "Used",
      city: city || "Unknown",
      images: imagePaths,
      adminId: req.admin?.id,
    });

    await saleBike.save();
    res.status(201).json({ success: true, bike: saleBike });
  } catch (err) {
    console.error("❌ sale-bikes create error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* --------------------------------------------------------------------------
 * 📋 GET /api/sale-bikes — Get all sale bikes (Public)
 * -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(6, Number(req.query.limit) || 24);
    const skip = (page - 1) * limit;

    const [bikes, total] = await Promise.all([
      SaleBike.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SaleBike.countDocuments(),
    ]);

    res.json({ success: true, total, bikes });
  } catch (err) {
    console.error("❌ sale-bikes fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sale bikes" });
  }
});

/* --------------------------------------------------------------------------
 * 🆕 GET /api/sale-bikes/latest — Get latest bikes (Public)
 * -------------------------------------------------------------------------- */
router.get("/latest", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 6;
    const bikes = await SaleBike.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, bikes });
  } catch (err) {
    console.error("❌ sale-bikes latest error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch latest sale bikes" });
  }
});

/* --------------------------------------------------------------------------
 * ✏️ PUT /api/sale-bikes/:id — Update sale bike (Main Admin only)
 * -------------------------------------------------------------------------- */
router.put("/:id", verifyMainAdmin, upload.array("newImages", 10), async (req, res) => {
  try {
    const bike = await SaleBike.findById(req.params.id);
    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    // 🧩 Parse existing images
    const existingImages = req.body.existingImages
      ? JSON.parse(req.body.existingImages)
      : [];

    // 🆕 Upload new images (if any)
    const newImagePaths = req.files?.length
      ? await Promise.all(
          req.files.map((f) => uploadToCloudinary(f, "sale-bikes"))
        )
      : [];

    // ✅ Update bike fields first (to avoid overwriting images)
    Object.assign(bike, {
      modelName: req.body.modelName || bike.modelName,
      brand: req.body.brand || bike.brand,
      price: req.body.price || bike.price,
      description: req.body.description || bike.description,
      year: req.body.year || bike.year,
      mileage: req.body.mileage || bike.mileage,
      condition: req.body.condition || bike.condition,
      city: req.body.city || bike.city,
    });

    // ✅ Then safely set updated image array
    bike.images = [...existingImages, ...newImagePaths];

    await bike.save();

    res.json({
      success: true,
      message: "✅ Sale bike updated successfully",
      bike,
    });
  } catch (err) {
    console.error("❌ sale-bikes update error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update sale bike",
    });
  }
});

/* --------------------------------------------------------------------------
 * 🗑️ DELETE /api/sale-bikes/:id — Delete sale bike (Main Admin only)
 * -------------------------------------------------------------------------- */
router.delete("/:id", verifyMainAdmin, async (req, res) => {
  try {
    const bike = await SaleBike.findById(req.params.id);
    if (!bike)
      return res.status(404).json({ success: false, message: "Bike not found" });

    // 🧹 Delete images from Cloudinary
    for (const url of bike.images || []) {
      try {
        const parts = url.split("/");
        const publicId = parts.slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn("⚠️ Failed to delete Cloudinary file:", err.message);
      }
    }

    await SaleBike.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "✅ Sale bike deleted successfully" });
  } catch (err) {
    console.error("❌ sale-bikes delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
/* --------------------------------------------------------------------------
 * 🆔 GET /api/sale-bikes/:id — Get single bike details (Public)
 * -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const bike = await SaleBike.findById(req.params.id).lean();
    if (!bike) {
      return res.status(404).json({ success: false, message: "Bike not found" });
    }

    res.json({ success: true, bike });
  } catch (err) {
    console.error("❌ sale-bikes get-by-id error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch bike details" });
  }
});


export default router;

import express from "express";
import SaleBike from "../models/SaleBike.js";
import { upload, uploadToCloudinary, cloudinary } from "../utils/upload.js";
import { verifyAdmin } from "../middleware/adminAuth.js"; // ✅ Use your existing named export

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* 🛠️  Create a new sale bike (Admin only)                                    */
/* -------------------------------------------------------------------------- */
router.post("/", verifyAdmin, upload.array("images", 10), async (req, res) => {
  try {
    const { modelName, brand, price, description, year, mileage, condition, city } = req.body;

    if (!modelName || !brand || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (modelName, brand, price)",
      });
    }

    // ✅ Cloudinary URLs (upload.js already configured)
   // NEW:
const imagePaths = await Promise.all(
  req.files.map((f) => uploadToCloudinary(f.buffer, "sale-bikes"))
);

    if (imagePaths.length < 3) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload at least 3 images." });
    }

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
      adminId: req.admin?.id, // ✅ From verifyAdmin decoded token
    });

    await saleBike.save();
    res.status(201).json({ success: true, bike: saleBike });
  } catch (err) {
    console.error("❌ sale-bikes create error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* 📋  Get all sale bikes (Public)                                            */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 🆕  Get latest N sale bikes (Public)                                       */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* ✏️  Update sale bike (Admin only)                                          */
/* -------------------------------------------------------------------------- */
router.put("/:id", verifyAdmin, upload.array("newImages", 10), async (req, res) => {
  try {
    const bike = await SaleBike.findById(req.params.id);
    if (!bike)
      return res.status(404).json({ success: false, message: "Bike not found" });

    const existingImages = req.body.existingImages
      ? JSON.parse(req.body.existingImages)
      : [];
    const newImagePaths = req.files?.map((f) => f.path) || [];

    bike.images = [...existingImages, ...newImagePaths];
    Object.assign(bike, req.body);

    await bike.save();
    res.json({
      success: true,
      message: "✅ Sale bike updated successfully",
      bike,
    });
  } catch (err) {
    console.error("❌ sale-bikes update error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update sale bike" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🗑️  Delete sale bike (Admin only)                                          */
/* -------------------------------------------------------------------------- */
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const bike = await SaleBike.findById(req.params.id);
    if (!bike)
      return res.status(404).json({ success: false, message: "Bike not found" });

    // 🧹 Delete Cloudinary images
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

export default router;

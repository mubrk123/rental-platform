// backend/routes/saleBikeRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import SaleBike from "../models/SaleBike.js";

const router = express.Router();

// Multer storage for sale bike images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/sale-bikes";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({ storage });

// ----------------------
// Create new sale bike (admin only)
// ----------------------
router.post("/", upload.array("images", 10), async (req, res) => {
  try {
    // simple admin guard
    const adminSecret = req.headers["x-admin-secret"] || req.query.admin_secret;
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { modelName, brand, price, description, year, mileage, condition, city } = req.body;

    // Validation
    if (!modelName || !brand || !price) {
      return res.status(400).json({ success: false, message: "Missing required fields (modelName, brand, price)" });
    }

    const files = req.files || [];
    if (files.length < 3) {
      // remove uploaded files (cleanup) if not enough images
      files.forEach((f) => {
        const p = path.join(process.cwd(), `uploads/sale-bikes/${f.filename}`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      return res.status(400).json({ success: false, message: "Please upload at least 3 images." });
    }

    const imagePaths = files.map((f) => `/uploads/sale-bikes/${f.filename}`);

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
    });

    await saleBike.save();
    res.status(201).json({ success: true, bike: saleBike });
  } catch (err) {
    console.error("❌ sale-bikes create error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ----------------------
// Get all sale bikes
// ----------------------
router.get("/", async (req, res) => {
  try {
    // optional pagination
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(6, Number(req.query.limit) || 24);
    const skip = (page - 1) * limit;

    const [bikes, total] = await Promise.all([
      SaleBike.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SaleBike.countDocuments(),
    ]);

   res.json(bikes);

  } catch (err) {
    console.error("❌ sale-bikes fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sale bikes" });
  }
});

// ----------------------
// Get latest N (default 6)
// ----------------------
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
router.put("/:id", upload.array("newImages", 3), async (req, res) => {
  const bike = await SaleBike.findById(req.params.id);
  if (!bike) return res.status(404).json({ message: "Bike not found" });

  const { existingImages } = req.body;
  let updatedImages = [];

  if (existingImages) {
    updatedImages = JSON.parse(existingImages);
  }

  if (req.files?.length) {
    const newPaths = req.files.map((file) => `/uploads/${file.filename}`);
    updatedImages = [...updatedImages, ...newPaths];
  }

  bike.images = updatedImages;
  Object.assign(bike, req.body);
  await bike.save();
  res.json(bike);
});


export default router;

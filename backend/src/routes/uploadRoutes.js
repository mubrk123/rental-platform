// routes/uploadRoutes.js
import express from "express";
import { upload } from "../utils/upload.js";
import Vehicle from "../models/Vehicle.js";
import { verifyMainAdmin } from "../middleware/adminAuth.js"; // ✅ updated import

const router = express.Router();

/**
 * ✅ Upload additional vehicle images (Main Admin only)
 */
router.post(
  "/vehicle-images/:vehicleId",
  verifyMainAdmin,
  upload.array("images", 10),
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.findById(req.params.vehicleId);
      if (!vehicle)
        return res.status(404).json({ message: "Vehicle not found" });

      const files = req.files || [];
      const urls = files.map((f) => f.path);
      vehicle.images = (vehicle.images || []).concat(urls);
      await vehicle.save();

      res.json({ success: true, images: vehicle.images });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * ✅ Upload user documents (accessible to both admins)
 */
router.post("/user-docs", upload.array("documents", 5), async (req, res, next) => {
  try {
    const files = req.files || [];
    const docs = files.map((f) => ({
      type: req.body.type || "other",
      fileUrl: f.path,
    }));
    res.json({ success: true, documents: docs });
  } catch (err) {
    next(err);
  }
});

export default router;

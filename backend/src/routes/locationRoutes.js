import express from "express";
import bcrypt from "bcryptjs";
import Location from "../models/Location.js";
import AdminCredentials from "../models/AdminCredentials.js";
import { verifyMainAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

// GET /api/locations — public, used by frontend dropdown
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 }).lean();
    res.json({ success: true, locations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/locations/active — only active, used by booking flow
router.get("/active", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ success: true, locations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/locations — main admin only
router.post("/", verifyMainAdmin, async (req, res) => {
  try {
    const { name, locationCode, address, mapsLink, handlerName, handlerPhone, isActive } = req.body;
    if (!name || !locationCode || !address)
      return res.status(400).json({ success: false, message: "name, locationCode and address are required" });

    const existing = await Location.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing)
      return res.status(400).json({ success: false, message: "Branch with this name already exists" });

    const location = await Location.create({
      name, locationCode: locationCode.toUpperCase(), address,
      mapsLink: mapsLink || "", handlerName: handlerName || "",
      handlerPhone: handlerPhone || "", isActive: isActive !== false,
    });

    // Create handler credential for this branch
    const { handlerEmail, handlerPassword } = req.body;
    if (handlerEmail && handlerPassword) {
      const hash = await bcrypt.hash(handlerPassword, 10);
      await AdminCredentials.create({
        role: "handler",
        email: handlerEmail.toLowerCase().trim(),
        password: hash,
        locationId: location._id,
        locationName: location.name,
      });
    } else {
      // Create default credential
      const hash = await bcrypt.hash("handler123", 10);
      await AdminCredentials.create({
        role: "handler",
        email: `handler.${locationCode.toLowerCase()}@newbikeworld.in`,
        password: hash,
        locationId: location._id,
        locationName: location.name,
      });
    }

    res.status(201).json({ success: true, location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/locations/:id — main admin only
router.put("/:id", verifyMainAdmin, async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!location)
      return res.status(404).json({ success: false, message: "Branch not found" });

    // Sync locationName in credentials if name changed
    if (req.body.name) {
      await AdminCredentials.updateMany(
        { locationId: req.params.id },
        { $set: { locationName: req.body.name } }
      );
    }

    res.json({ success: true, location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/locations/:id — main admin only
router.delete("/:id", verifyMainAdmin, async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location)
      return res.status(404).json({ success: false, message: "Branch not found" });
    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

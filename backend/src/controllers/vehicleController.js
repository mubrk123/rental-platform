// 📁 backend/src/controllers/vehicleController.js

import Vehicle from "../models/Vehicle.js";
import path from "path";

/**
 * ✅ Helper: formats vehicle image URLs and calculates available count
 */
const formatVehicleData = (req, v) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const images = v.images?.map((img) =>
    img.startsWith("uploads/")
      ? `${baseUrl}/${img.replace(/\\/g, "/")}`
      : img
  );
  const availableCount = Math.max(
    0,
    (v.totalQuantity || 0) - (v.bookedQuantity || 0)
  );
  return { ...v.toObject(), images, availableCount };
};

/**
 * ✅ POST /api/vehicles
 * Upload a new vehicle with images
 */
export const createVehicle = async (req, res) => {
  try {
    const { modelName, brand, rentPerDay, totalQuantity, city, type } = req.body;
    const normalizedType = type.toLowerCase();

    const imagePaths = req.files
      ? req.files.map((file) => `uploads/vehicles/${file.filename}`)
      : [];

    const newVehicle = await Vehicle.create({
      modelName,
      brand,
      rentPerDay,
      totalQuantity,
      bookedQuantity: 0,
      type: normalizedType,
      location: { city },
      images: imagePaths,
    });

    res.status(201).json({
      success: true,
      message: "✅ Vehicle uploaded successfully!",
      vehicle: newVehicle,
    });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    res.status(500).json({
      success: false,
      message: "❌ Error creating vehicle",
      error: error.message,
    });
  }
};

/**
 * ✅ GET /api/vehicles
 * List all vehicles (with optional city filter)
 */
export const listVehicles = async (req, res) => {
  try {
    const city = req.query.city;
    const query = city ? { "location.city": city } : {};

    const vehicles = await Vehicle.find(query).lean();

    const formatted = vehicles.map((v) => {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const images = v.images?.map((img) =>
        img.startsWith("uploads/")
          ? `${baseUrl}/${img.replace(/\\/g, "/")}`
          : img
      );
      const availableCount = Math.max(
        0,
        (v.totalQuantity || 0) - (v.bookedQuantity || 0)
      );
      return { ...v, images, availableCount };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error listing vehicles:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching vehicles",
      error: err.message,
    });
  }
};

/**
 * ✅ GET /api/vehicles/:id
 * Fetch a single vehicle by ID
 */
export const getVehicleById = async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v)
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });

    const formatted = formatVehicleData(req, v);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching vehicle:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching vehicle",
      error: err.message,
    });
  }
};

/**
 * ✅ DELETE /api/vehicles/:id
 * Delete a vehicle (admin only)
 */
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    await Vehicle.findByIdAndDelete(id);
    res.json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting vehicle" });
  }
};

import Vehicle from "../models/Vehicle.js";
import { cloudinary } from "../utils/upload.js";

/**
 * ✅ Helper: formats vehicle image URLs and calculates available count
 */
const formatVehicleData = (req, v) => {
  const images = v.images?.map((img) => img);
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
    const {
      modelName,
      brand,
      rentPerDay,
      totalQuantity,
      city,
      type,
      kmLimitPerDay,
    } = req.body;

    const normalizedType = type?.toLowerCase();
    const imagePaths = req.files ? req.files.map((file) => file.path) : [];

    // ✅ Safe numeric parsing for creation
    const parsedRent =
      rentPerDay !== undefined && rentPerDay !== ""
        ? Math.round(Number(rentPerDay))
        : 0;

    const parsedQuantity =
      totalQuantity !== undefined && totalQuantity !== ""
        ? Math.max(0, Number(totalQuantity))
        : 0;

    const parsedKmLimit =
      kmLimitPerDay !== undefined && kmLimitPerDay !== ""
        ? Math.max(0, Number(kmLimitPerDay))
        : 150;

    const newVehicle = await Vehicle.create({
      modelName,
      brand,
      rentPerDay: parsedRent,
      totalQuantity: parsedQuantity,
      bookedQuantity: 0,
      type: normalizedType,
      kmLimitPerDay: parsedKmLimit,
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
 */
export const listVehicles = async (req, res) => {
  try {
    const city = req.query.city;
    const query = city ? { "location.city": city } : {};

    const vehicles = await Vehicle.find(query).lean();
    const formatted = vehicles.map((v) => {
      const images = v.images?.map((img) => img);
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
 */
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);
    if (!vehicle)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    // ✅ Delete images from Cloudinary
    if (vehicle.images?.length) {
      for (const url of vehicle.images) {
        try {
          const parts = url.split("/");
          const publicId = parts.slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn("⚠️ Failed to delete Cloudinary file:", err.message);
        }
      }
    }

    await Vehicle.findByIdAndDelete(id);
    res.json({ success: true, message: "✅ Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ success: false, message: "Error deleting vehicle" });
  }
};

/**
 * ✅ PUT /api/vehicles/:id
 * Update vehicle details and images
 */
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      modelName,
      brand,
      rentPerDay,
      totalQuantity,
      city,
      type,
      kmLimitPerDay,
    } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle)
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });

    // ✅ Safe numeric casting
    const parsedRent =
      rentPerDay !== undefined && rentPerDay !== ""
        ? Math.round(Number(rentPerDay))
        : vehicle.rentPerDay;

    const parsedQuantity =
      totalQuantity !== undefined && totalQuantity !== ""
        ? Math.max(0, Number(totalQuantity))
        : vehicle.totalQuantity;

    const parsedKmLimit =
      kmLimitPerDay !== undefined && kmLimitPerDay !== ""
        ? Math.max(0, Number(kmLimitPerDay))
        : vehicle.kmLimitPerDay;

    // ✅ Update details
    vehicle.modelName = modelName || vehicle.modelName;
    vehicle.brand = brand || vehicle.brand;
    vehicle.rentPerDay = parsedRent;
    vehicle.totalQuantity = parsedQuantity;
    vehicle.type = type ? type.toLowerCase() : vehicle.type;
    vehicle.location = { city: city || vehicle.location?.city };
    vehicle.kmLimitPerDay = parsedKmLimit;

    // ✅ Handle new image uploads (if any)
    if (req.files && req.files.length > 0) {
      const newImagePaths = req.files.map((file) => file.path);
      vehicle.images = newImagePaths;
    }

    await vehicle.save();

    const formatted = {
      ...vehicle.toObject(),
      availableCount: Math.max(
        0,
        (vehicle.totalQuantity || 0) - (vehicle.bookedQuantity || 0)
      ),
    };

    res.json({
      success: true,
      message: "✅ Vehicle updated successfully!",
      vehicle: formatted,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({
      success: false,
      message: "❌ Error updating vehicle",
      error: error.message,
    });
  }
};

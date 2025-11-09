// models/Vehicle.js
import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true },
    brand: { type: String, trim: true },
    type: { type: String, enum: ["bike", "scooter"], required: true },
    description: { type: String },
    images: [{ type: String }],
    rentPerDay: { type: Number, required: true },
    totalQuantity: { type: Number, default: 1, min: 0 },
    bookedQuantity: { type: Number, default: 0, min: 0 },

    // ✅ Add this field
    kmLimitPerDay: { type: Number, default: 150 }, // Example default: 150 km/day

    location: {
      city: { type: String, required: true, index: true },
      address: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

vehicleSchema.virtual("availableCount").get(function () {
  return Math.max(0, (this.totalQuantity || 0) - (this.bookedQuantity || 0));
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;

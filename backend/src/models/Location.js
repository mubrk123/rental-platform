import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    locationCode: { type: String, required: true, trim: true, uppercase: true },
    address: { type: String, required: true, trim: true },
    mapsLink: { type: String, trim: true, default: "" },
    handlerName: { type: String, trim: true, default: "" },
    handlerPhone: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Location", locationSchema);

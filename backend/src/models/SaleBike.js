// backend/models/SaleBike.js
import mongoose from "mongoose";

const saleBikeSchema = new mongoose.Schema({
  modelName: { type: String, required: true },
  brand: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: "" },
  year: { type: Number },
  mileage: { type: String, default: "" },
  condition: { type: String, default: "Used" },
  city: { type: String, default: "Unknown" },
  images: [{ type: String }], // store paths like /uploads/sale-bikes/xxx.jpg
  createdAt: { type: Date, default: Date.now },
});

const SaleBike = mongoose.model("SaleBike", saleBikeSchema);
export default SaleBike;

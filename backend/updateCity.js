// updateCity.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Vehicle from "./src/models/Vehicle.js";

dotenv.config();

const updateCity = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await Vehicle.updateMany(
      { city: "GandhiNagar" },
      { $set: { city: "Majestic (Gandhi Nagar)" } }
    );
    console.log(`✅ Updated ${result.modifiedCount} vehicles.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Update failed:", err);
  }
};

updateCity();

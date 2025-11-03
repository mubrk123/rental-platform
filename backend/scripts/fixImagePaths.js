import mongoose from "mongoose";
import dotenv from "dotenv";
import Vehicle from "../models/Vehicle.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rentalDB";

const fixImagePaths = async () => {
  await mongoose.connect(MONGO_URI);

  const vehicles = await Vehicle.find({});
  let fixed = 0;

  for (const v of vehicles) {
    if (v.images?.length) {
      const updated = v.images.map((url) =>
        url
          .replace("http://localhost:5050/api//uploads", "http://localhost:5050/uploads")
          .replace("http://localhost:5050/api/uploads", "http://localhost:5050/uploads")
          .replace("//uploads", "/uploads")
      );

      if (JSON.stringify(updated) !== JSON.stringify(v.images)) {
        v.images = updated;
        await v.save();
        fixed++;
      }
    }
  }

  console.log(`✅ Fixed ${fixed} vehicles.`);
  await mongoose.disconnect();
};

fixImagePaths().catch(console.error);

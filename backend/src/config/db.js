import mongoose from "mongoose";
import keys from "./keys.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(keys.mongoURI, {
      // options included by default in mongoose 7+
    });
    console.log(`📦 MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  }
};

export default connectDB;

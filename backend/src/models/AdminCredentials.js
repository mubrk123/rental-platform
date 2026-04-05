import mongoose from "mongoose";

const adminCredentialsSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["mainAdmin", "handler"],
      required: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true }, // bcrypt hashed
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null, // null for mainAdmin
    },
    locationName: { type: String, default: "" }, // denormalized for display
  },
  { timestamps: true }
);

export default mongoose.model("AdminCredentials", adminCredentialsSchema);

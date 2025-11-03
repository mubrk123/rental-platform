// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // Can remain String since you’re not referencing a User model yet
    vehicleId: { type: String, required: true },
    bookingId: { type: String, unique: true, default: () => `BK-${Date.now()}` },
    city: String,
   
    pickupDate: { type: Date},
    dropoffDate: { type: Date},

    name: { type: String },
    phoneNumber: { type: String },
    email: String,

    aadhaarDocument: String,
    licenseDocument: String,
    pickupPhoto: { type: String },
pickupPDF: { type: String },


    orderId: String, // Razorpay order ID
    paymentId: String, // Razorpay payment ID

    amount: { type: Number, default: 0 },
    days: Number,

    status: {
      type: String,
      enum: ["pending", "paid", "active", "completed", "cancelled" , "booked"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// ✅ Virtual for totalPrice (can be used for analytics)
bookingSchema.virtual("totalPrice").get(function () {
  return this.amount || 0;
});

export default mongoose.model("Booking", bookingSchema);

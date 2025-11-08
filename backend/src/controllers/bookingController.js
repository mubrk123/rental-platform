import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import { generateBookingId } from "../utils/generateBookingId.js";
export const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, phone, vehicleId, startDate, endDate } = req.body;
    if (!name || !phone || !vehicleId || !startDate || !endDate) {
      throw Object.assign(new Error("Missing required booking fields"), { statusCode: 400 });
    }

    const vehicle = await Vehicle.findById(vehicleId).session(session);
    if (!vehicle) throw Object.assign(new Error("Vehicle not found"), { statusCode: 404 });

    const available = (vehicle.totalQuantity || 0) - (vehicle.bookedQuantity || 0);
    if (available <= 0) throw Object.assign(new Error("No vehicles available"), { statusCode: 400 });

    const s = new Date(startDate);
    const e = new Date(endDate);
    const msPerDay = 1000*60*60*24;
    const days = Math.max(1, Math.ceil((e - s) / msPerDay));
    const totalCost = days * vehicle.rentPerDay;

    // handle documents uploaded via multer
    const docs = (req.files && req.files.documents)
  ? req.files.documents.map((f) => ({
      type: req.body.docTypes || "other",
      fileUrl: f.path, // Cloudinary gives HTTPS URL directly
    }))
  : [];
    const booking = await Booking.create([{
      bookingId: generateBookingId(),
      name,
      email,
      phone,
      vehicle: vehicle._id,
      startDate: s,
      endDate: e,
      days,
      totalCost,
      documents: docs,
      payment: { status: "pending", amount: totalCost }
    }], { session });

    // increment bookedQuantity
    vehicle.bookedQuantity = (vehicle.bookedQuantity || 0) + 1;
    await vehicle.save({ session });

    await session.commitTransaction();
    session.endSession();

    const created = await Booking.findById(booking[0]._id).populate("vehicle").lean();
    res.status(201).json(created);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

export const confirmPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentId, gateway, status, amount, raw } = req.body;
    if (!bookingId) throw Object.assign(new Error("bookingId required"), { statusCode: 400 });

    const booking = await Booking.findOne({ bookingId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.payment = {
      gateway,
      paymentId,
      amount: amount || booking.totalCost,
      status: status || "paid",
      raw: raw || {}
    };

    // if payment failed, consider releasing vehicle: decrement bookedQuantity and set status cancelled
    if (status === "failed") {
      booking.status = "cancelled";
      // decrement bookedQuantity safely
      await Vehicle.findByIdAndUpdate(booking.vehicle, { $inc: { bookedQuantity: -1 } });
    } else if (status === "paid") {
      booking.status = "booked";
    }

    await booking.save();
    const populated = await Booking.findById(booking._id).populate("vehicle").lean();
    res.json({ success: true, booking: populated });
  } catch (err) { next(err); }
};
export const listBookings = async (req, res, next) => {
  try {
    const { phone, email } = req.query;
    const filter = {};
    if (phone) filter.phone = phone;
    if (email) filter.email = email;
    const bookings = await Booking.find(filter).populate("vehicle").sort({ createdAt: -1 }).lean();
    // add remainingDays
    const enhanced = bookings.map(b => ({ ...b, remainingDays: (new Date(b.endDate) - new Date() > 0) ? Math.ceil((new Date(b.endDate) - new Date())/(1000*60*60*24)) : 0 }));
    res.json(enhanced);
  } catch (err) { next(err); }
};

/**
 * GET /api/bookings/:bookingId
 */
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).populate("vehicle").lean();
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    booking.remainingDays = (new Date(booking.endDate) - new Date() > 0) ? Math.ceil((new Date(booking.endDate) - new Date())/(1000*60*60*24)) : 0;
    res.json(booking);
  } catch (err) { next(err); }
};
export const markPdfDownloaded = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.pdfDownloaded = true;
    await booking.save();

    res.json({ success: true, message: "PDF marked as downloaded" });
  } catch (err) {
    console.error("Error marking PDF as downloaded:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
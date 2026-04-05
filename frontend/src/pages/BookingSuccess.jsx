// 📁 frontend/src/pages/BookingSuccess.jsx
import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2,
  MapPin,
  KeyRound,
  CornerDownRight,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import axios from "axios";

const BookingSuccess = () => {
  const { state } = useLocation();
  const initialBooking = state?.booking || null;
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(!initialBooking);
  const [verifying, setVerifying] = useState(true);

  // 🧠 Poll backend until booking is verified
  useEffect(() => {
    if (!initialBooking?.vehicleId) return;

    const fetchBookingStatus = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/bookings/status/${initialBooking.vehicleId}`
        );
        if (data?.success && data.booking?.status === "paid") {
          setBooking((prev) => ({ ...prev, ...data.booking }));
          setVerifying(false);
        }
      } catch {
        console.warn("Waiting for backend verification...");
      }
    };

    const interval = setInterval(fetchBookingStatus, 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setVerifying(false);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [initialBooking]);

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-sky-700">
        <Loader2 className="w-10 h-10 animate-spin mb-3" />
        <p>Preparing your confirmation...</p>
      </div>
    );

  if (!booking)
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-gray-600">No booking details found.</p>
        <Link
          to="/"
          className="mt-4 bg-[#0A3D62] text-white px-5 py-2 rounded-lg shadow hover:bg-sky-700 transition"
        >
          Back to Home
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex flex-col items-center justify-center py-12 px-4 transition-all duration-500">
      {/* ✅ Success or Verifying Icon */}
      <div
        className={`p-4 rounded-full mb-4 shadow-inner ${
          verifying ? "bg-yellow-100" : "bg-green-100"
        }`}
      >
        {verifying ? (
          <Loader2 className="w-16 h-16 text-yellow-500 animate-spin" />
        ) : (
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        )}
      </div>

      {/* ✅ Personalized Title */}
      <h2 className="text-3xl font-extrabold text-[#0A3D62] mb-2">
        {verifying ? "Finalizing Your Booking..." : `Thank You, ${booking.name}!`}
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        {verifying
          ? "Please wait a few seconds while we confirm your payment and documents."
          : "Your Bangalore adventure is confirmed! Get ready to ride."}
      </p>

      {/* ✅ Booking Ticket Card */}
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-lg border border-blue-100 relative">
        {/* Bike Image */}
        <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-50 mb-4">
          <img
            src={
              booking.vehicleImage ||
              "https://placehold.co/400x200?text=Your+Ride+is+Ready"
            }
            alt="Booked Bike"
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Bike & Booking Info */}
        <h3 className="text-2xl font-semibold text-[#0A3D62] mb-1">
          {booking.vehicleName || "Your Selected Bike"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Booking Reference:{" "}
          <span className="font-mono text-gray-700">{booking.vehicleId}</span>
        </p>

        <div className="space-y-2 text-gray-700">
          <p className="flex items-center">
            <MapPin className="w-5 h-5 text-sky-600 mr-2" />
            <strong>Location:</strong>&nbsp;{booking.city}
          </p>
          <p className="flex items-center">
            <KeyRound className="w-5 h-5 text-sky-600 mr-2" />
            <strong>Pickup:</strong>&nbsp;{booking.pickupDate}
          </p>
          <p className="flex items-center">
            <CornerDownRight className="w-5 h-5 text-sky-600 mr-2" />
            <strong>Dropoff:</strong>&nbsp;{booking.dropoffDate}
          </p>
        </div>

        <div className="mt-5 border-t pt-4 text-sm text-gray-600">
          <p className="flex items-center">
            <Mail className="w-4 h-4 text-blue-500 mr-2" />
            Confirmation sent to <strong>&nbsp;{booking.email}</strong>
          </p>
          <p className="flex items-center mt-1">
            <Phone className="w-4 h-4 text-blue-500 mr-2" />
            WhatsApp confirmation sent to{" "}
            <strong>&nbsp;{booking.phoneNumber}</strong>
          </p>
        </div>

        {/* ✅ Embedded Map */}
        <div className="mt-6 rounded-lg overflow-hidden shadow-md border">
          <iframe
            title="pickup-map"
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              booking.city
            )}&output=embed`}
          ></iframe>
        </div>

        {/* ✅ Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              booking.city
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#0A3D62] text-white text-center py-2 rounded-lg font-semibold hover:bg-sky-700 transition"
          >
            Get Directions to Pickup
          </a>

          <button
            onClick={() =>
              alert("This will add the booking to Google Calendar (coming soon!)")
            }
            className="flex-1 bg-gray-100 text-gray-800 text-center py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Add to Calendar
          </button>
        </div>

        {/* ✅ Back Button */}
        <Link
          to="/vehicles"
          state={{ refresh: true }}
          className="mt-4 block text-center border border-[#0A3D62] text-[#0A3D62] py-2 rounded-lg font-medium hover:bg-sky-50 transition"
        >
          Back to Vehicles
        </Link>

        {/* ✅ Footer Support */}
        <p className="text-xs text-gray-500 mt-6 text-center">
          Need help or modify your booking? <br />
          Call us at <strong>+91 98765 43210</strong> or reply to your confirmation email.
        </p>
      </div>
    </div>
  );
};

export default BookingSuccess;

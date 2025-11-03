import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { Upload, ShieldCheck, CreditCard, CheckCircle } from "lucide-react";

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const city = queryParams.get("city");
  const pickupDate = queryParams.get("pickupDate");
  const dropoffDate = queryParams.get("dropoffDate");
  // new: pickupTime / dropoffTime
  const pickupTime = queryParams.get("pickupTime") || "00:00";
  const dropoffTime = queryParams.get("dropoffTime") || "00:00";

  // --------------------------
  // STATES
  // --------------------------
  const [form, setForm] = useState({
    userId: "123", // Replace with logged-in user ID later
    name: "",
    email: "",
    phoneNumber: "",
    aadhaarDocument: null,
    licenseDocument: null,
  });

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);

  // Price breakdown state
  const [priceBreakdown, setPriceBreakdown] = useState({
  chargedDays: 0,
  chargedHours: 0,
  subtotal: 0,
  taxes: 0,
  handling: 10,
  total: 10,
  note: "",
});


  // --------------------------
  // FETCH SELECTED VEHICLE
  // --------------------------
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/vehicles/${id}`);
        setVehicle(res.data);
      } catch (err) {
        console.error("Error fetching vehicle:", err);
      } finally {
        setVehicleLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  // --------------------------
  // PRICE CALCULATION FUNCTION
  // --------------------------
 const computePrice = (rentPerDay, pickupDateStr, pickupTimeStr, dropoffDateStr, dropoffTimeStr) => {
  const parseDateTime = (d, t) => {
    if (!d) return null;
    const time = t || "00:00";
    const iso = `${d}T${time}:00`;
    const dt = new Date(iso);
    if (isNaN(dt)) return new Date(`${d} ${time}`);
    return dt;
  };

  const start = parseDateTime(pickupDateStr, pickupTimeStr);
  const end = parseDateTime(dropoffDateStr, dropoffTimeStr);
  if (!start || !end || isNaN(start) || isNaN(end) || end <= start) {
    return {
      chargedDays: 0,
      chargedHours: 0,
      subtotal: 0,
      taxes: 0,
      handling: 10,
      total: 10,
      note: "Invalid dates/times",
    };
  }

  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const minutesInDay = 24 * 60;
  const daysFull = Math.floor(durationMinutes / minutesInDay);
  const remainderMinutes = durationMinutes % minutesInDay;
  const perHour = rentPerDay / 24;

  if (durationMinutes <= minutesInDay) {
    const subtotal = Math.round(rentPerDay);
    const taxes = Math.round(subtotal * 0.1);
    const handling = 10;
    const total = subtotal + taxes + handling;
    return {
      chargedDays: 1,
      chargedHours: 0,
      subtotal,
      taxes,
      handling,
      total,
      note: "Minimum 24-hour price applied",
    };
  }

  let chargedDays = daysFull;
  let chargedHours = 0;
  let subtotal = 0;
  let note = "";

  if (remainderMinutes === 0) {
    subtotal = Math.round(rentPerDay * chargedDays);
    note = "Exact full days";
  } else if (remainderMinutes > 12 * 60) {
    chargedDays = daysFull + 1;
    subtotal = Math.round(rentPerDay * chargedDays);
    note = "Remainder > 12 hours, charged as an extra full day";
  } else {
    const remHoursFloor = Math.floor(remainderMinutes / 60);
    const remMinutes = remainderMinutes % 60;
    const remHoursRounded = remHoursFloor + (remMinutes > 30 ? 1 : 0);
    chargedHours = remHoursRounded === 0 ? 0 : remHoursRounded;
    subtotal = Math.round(rentPerDay * chargedDays + perHour * chargedHours);
    note = `Charged ${chargedHours} extra hour(s)`;
  }

  const taxes = Math.round(subtotal * 0.1);
  const handling = 10;
  const total = Math.round(subtotal + taxes + handling);

  return {
    chargedDays,
    chargedHours,
    subtotal,
    taxes,
    handling,
    total,
    note,
  };
};


  // compute price after vehicle loaded or when query changes
  useEffect(() => {
    if (!vehicle) return;
    const rentPerDay = Number(vehicle.rentPerDay) || 0;
    const breakdown = computePrice(rentPerDay, pickupDate, pickupTime, dropoffDate, dropoffTime);
    setPriceBreakdown(breakdown);
  }, [vehicle, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  // --------------------------
  // HANDLERS
  // --------------------------
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setForm({ ...form, [name]: files[0] });
  };

  // OTP send with timer
  const handleSendOtp = async () => {
    if (!form.phoneNumber) return alert("Enter phone number first.");
    if (timer > 0) return; // Prevent sending during cooldown
    setSendingOtp(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/otp/send`, {
        phoneNumber: form.phoneNumber,
      });
      setOtpSent(true);
      setTimer(30);
      alert("OTP sent to your WhatsApp!");

      const countdown = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("OTP send error:", err);
      alert("Failed to send OTP. Try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // OTP verify
  const handleVerifyOtp = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/otp/verify`, {
        phoneNumber: form.phoneNumber,
        otp,
      });
      if (res.data.success) {
        setOtpVerified(true);
        alert("Phone verified successfully!");
      } else {
        alert("Invalid OTP!");
      }
    } catch {
      alert("OTP verification failed.");
    }
  };

  // --------------------------
  // HANDLE PAYMENT & BOOKING
  // --------------------------
  


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (vehicle?.availableCount === 0) {
  alert("This vehicle is currently not available for booking.");
  return;
}
    if (!otpVerified) return alert("Please verify your phone number first!");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/payments/create-order`,
        {
          pickupDate,
          dropoffDate,
          pricePerDay: vehicle?.rentPerDay || 500,
          userId: form.userId,
          vehicleId: id,
        }
      );

      if (!data.success) {
        alert("Error creating payment order");
        return;
      }

      const { order } = data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "NewBikeWorld Rentals",
        description: "Booking Payment",
        order_id: order.id,

        handler: async (response) => {
          try {
            // ✅ Combine payment verification + booking creation
            const formData = new FormData();
            formData.append("userId", form.userId);
            formData.append("vehicleId", id);
            formData.append("city", city);
            formData.append("pickupDate", pickupDate);
            formData.append("dropoffDate", dropoffDate);
            formData.append("name", form.name);
            formData.append("email", form.email);
            formData.append("phoneNumber", form.phoneNumber);

            // Razorpay returned fields
            formData.append("razorpay_order_id", response.razorpay_order_id);
            formData.append("razorpay_payment_id", response.razorpay_payment_id);
            formData.append("razorpay_signature", response.razorpay_signature);

            // Attach files if present
            if (form.aadhaarDocument)
              formData.append("aadhaarDocument", form.aadhaarDocument);
            if (form.licenseDocument)
              formData.append("licenseDocument", form.licenseDocument);

            // ✅ Send directly to /payments/verify-payment only (no /bookings/create)
            const verifyRes = await axios.post(
              `${import.meta.env.VITE_API_URL}/payments/verify-payment`,
              formData,
              { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (verifyRes.data?.success) {
             navigate("/booking-success", {
  state: {
    booking: {
      vehicleId: id,
      city,
      pickupDate,
      dropoffDate,
      name: form.name,
      phoneNumber: form.phoneNumber,
      email: form.email,
      vehicleName: location.state?.vehicleName, // Add this if passed from Vehicles page
      vehicleImage: location.state?.vehicleImage, // Add this if passed from Vehicles page
    },
  },
});

            } else {
              console.error("Verification failed:", verifyRes.data);
              alert("Payment verification failed. Booking not created.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("Error verifying payment. Please contact support.");
          }
        },

        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phoneNumber,
        },
        theme: { color: "#0A3D62" },
      };

      new window.Razorpay(options).open();
    } catch {
      alert("Something went wrong during payment.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // UI values (derived)
  // --------------------------
  const { chargedDays, chargedHours, perHourRate, subtotal, taxes, total, note } = priceBreakdown;

  // --------------------------
  // UI
  // --------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex justify-center items-start py-12 px-4">
      <div className="flex flex-col lg:flex-row w-full max-w-6xl bg-white shadow-xl rounded-2xl overflow-hidden border border-blue-100">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-2/3 p-8">
          <h2 className="text-3xl font-bold text-[#0A3D62] mb-6">
            Complete Your Booking
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-400"
            />

            {/* Email */}
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email Address"
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-400"
            />

            {/* Phone + OTP */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit Phone Number"
                  className={`w-full border rounded-lg p-3 ${
                    otpVerified ? "border-green-400 pr-10" : "border-gray-300"
                  }`}
                />
                {otpVerified && (
                  <CheckCircle className="absolute right-3 top-3 text-green-600 w-5 h-5" />
                )}
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || otpVerified || timer > 0}
                className={`px-4 rounded-lg font-medium text-white transition ${
                  otpVerified
                    ? "bg-green-600 cursor-default"
                    : "bg-[#0A3D62] hover:bg-sky-700 disabled:opacity-60"
                }`}
              >
                {otpVerified
                  ? "✅ Verified"
                  : sendingOtp
                  ? "Sending..."
                  : timer > 0
                  ? `Resend in ${timer}s`
                  : otpSent
                  ? "Resend OTP"
                  : "Send OTP"}
              </button>
            </div>

            {/* OTP Input */}
            {otpSent && !otpVerified && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="flex-1 border border-gray-300 rounded-lg p-3"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition"
                >
                  Verify
                </button>
              </div>
            )}

            {/* Aadhaar Upload */}
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Upload ID Proof (Aadhaar / Passport)
              </label>
              <label
                htmlFor="aadhaarUpload"
                className={`flex items-center justify-between border-2 border-dashed rounded-lg p-3 cursor-pointer transition ${
                  form.aadhaarDocument
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-blue-300 text-blue-700 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Upload
                    className={`w-4 h-4 ${
                      form.aadhaarDocument ? "text-green-600" : "text-blue-600"
                    }`}
                  />
                  <span>
                    {form.aadhaarDocument
                      ? `✅ ${form.aadhaarDocument.name}`
                      : "Upload ID Proof"}
                  </span>
                </div>
                <input
                  id="aadhaarUpload"
                  type="file"
                  name="aadhaarDocument"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            </div>

            {/* License Upload */}
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Upload Driver’s License
              </label>
              <label
                htmlFor="licenseUpload"
                className={`flex items-center justify-between border-2 border-dashed rounded-lg p-3 cursor-pointer transition ${
                  form.licenseDocument
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-blue-300 text-blue-700 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Upload
                    className={`w-4 h-4 ${
                      form.licenseDocument ? "text-green-600" : "text-blue-600"
                    }`}
                  />
                  <span>
                    {form.licenseDocument
                      ? `✅ ${form.licenseDocument.name}`
                      : "Upload Driver’s License"}
                  </span>
                </div>
                <input
                  id="licenseUpload"
                  type="file"
                  name="licenseDocument"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            </div>

            {/* Proceed Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0A3D62] to-[#3DC1D3] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
            >
              {loading ? "Processing..." : "Proceed to Payment"}
            </button>

            {/* Security Info */}
            <div className="flex items-center justify-center mt-3 text-sm text-gray-600">
              <ShieldCheck className="w-4 h-4 mr-2 text-sky-600" />
              🔒 Your payment is secure and encrypted
            </div>
            <div className="flex justify-center mt-1 space-x-2 opacity-70">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png"
                alt="Visa"
                className="h-4"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png"
                alt="Mastercard"
                className="h-4"
              />
              <CreditCard className="w-4 h-4 text-gray-500" />
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-1/3 bg-gradient-to-b from-[#0A3D62] to-[#3DC1D3] text-white p-8 flex flex-col justify-between sticky top-10">
          <div>
            <h3 className="text-xl font-semibold mb-4">Booking Summary</h3>

            {vehicleLoading ? (
              <div className="w-full h-40 bg-white/20 rounded-lg flex items-center justify-center text-white/70">
                Loading vehicle...
              </div>
            ) : vehicle ? (
              <>
                <img
                  src={vehicle.images?.[0] || "https://placehold.co/400x200?text=No+Image"}
                  alt={vehicle.modelName}
                  className="rounded-lg mb-3 w-full h-40 object-contain bg-white/10 p-2 transition-all duration-500 hover:scale-[1.02]"
                />
                <p className="font-bold text-lg">
                  {vehicle.brand} {vehicle.modelName}
                </p>
                <p className="text-sm text-white/80">₹{vehicle.rentPerDay} / day</p>
              </>
            ) : (
              <div className="w-full h-40 bg-white/20 rounded-lg flex items-center justify-center text-white/70">
                Vehicle not found
              </div>
            )}

            <div className="mt-3 text-sm space-y-1">
  <p>
    <strong>Pickup:</strong> {city} on {pickupDate} {pickupTime}
  </p>
  <p>
    <strong>Dropoff:</strong> {dropoffDate} {dropoffTime}
  </p>
  <hr className="my-3 border-white/30" />

  <p>
    Days charged: <span className="float-right">{chargedDays}</span>
  </p>
  {chargedHours > 0 && (
    <p>
      Extra hours charged: <span className="float-right">{chargedHours}</span>
    </p>
  )}

  <p className="mt-2">
    Subtotal: <span className="float-right">₹{subtotal}</span>
  </p>
  <p>
    Taxes & Fees (10%): <span className="float-right">₹{taxes}</span>
  </p>
  <p>
    Handling Charges: <span className="float-right">₹{priceBreakdown.handling}</span>
  </p>

  <p className="font-semibold text-lg mt-2">
    Total Payable:{" "}
    <span className="float-right font-bold text-white">₹{total}</span>
  </p>

  {note && (
    <p className="text-xs mt-2 opacity-90">
      <em>{note}</em>
    </p>
  )}
</div>

          </div>

          <p className="text-xs opacity-80 mt-6 text-center">
            Need help? Contact us at <strong>support@newbikeworld.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;

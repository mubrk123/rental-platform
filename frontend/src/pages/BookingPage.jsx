import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Upload, ShieldCheck, CreditCard, CheckCircle } from "lucide-react";

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const city = queryParams.get("city");
  const pickupDate = queryParams.get("pickupDate");
  const dropoffDate = queryParams.get("dropoffDate");
  const pickupTime = queryParams.get("pickupTime") || "00:00";
  const dropoffTime = queryParams.get("dropoffTime") || "00:00";

  const [form, setForm] = useState({
    userId: "123", // Replace later with real userId
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
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ---------------- Fetch Vehicle ----------------
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/vehicles/${id}`);
        setVehicle(res.data);
      } catch (err) {
        console.error("Error fetching vehicle:", err);
        toast.error("Failed to load vehicle details.");
      } finally {
        setVehicleLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  // ---------------- Price Calculation ----------------
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
    if (!start || !end || isNaN(start) || isNaN(end) || end <= start)
      return { chargedDays: 0, chargedHours: 0, subtotal: 0, taxes: 0, handling: 10, total: 10, note: "Invalid dates/times" };

    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const minutesInDay = 24 * 60;
    const daysFull = Math.floor(durationMinutes / minutesInDay);
    const remainderMinutes = durationMinutes % minutesInDay;
    const perHour = rentPerDay / 24;

    let chargedDays = daysFull;
    let chargedHours = 0;
    let subtotal = 0;
    let note = "";

    if (durationMinutes <= minutesInDay) {
      subtotal = Math.round(rentPerDay);
      return { chargedDays: 1, chargedHours, subtotal, taxes: Math.round(subtotal * 0.1), handling: 10, total: subtotal + Math.round(subtotal * 0.1) + 10, note: "Minimum 24-hour price applied" };
    }

    if (remainderMinutes === 0) {
      subtotal = Math.round(rentPerDay * chargedDays);
      note = "Exact full days";
    } else if (remainderMinutes > 12 * 60) {
      chargedDays++;
      subtotal = Math.round(rentPerDay * chargedDays);
      note = "Remainder > 12 hours, charged as an extra full day";
    } else {
      const remHours = Math.ceil(remainderMinutes / 60);
      chargedHours = remHours;
      subtotal = Math.round(rentPerDay * chargedDays + perHour * chargedHours);
      note = `Charged ${chargedHours} extra hour(s)`;
    }

    const taxes = Math.round(subtotal * 0.18);
    const total = Math.round(subtotal + taxes + 10);
    return { chargedDays, chargedHours, subtotal, taxes, handling: 10, total, note };
  };

  const priceBreakdown = useMemo(() => {
    if (!vehicle) return { chargedDays: 0, chargedHours: 0, subtotal: 0, taxes: 0, handling: 10, total: 10, note: "" };
    return computePrice(Number(vehicle.rentPerDay) || 0, pickupDate, pickupTime, dropoffDate, dropoffTime);
  }, [vehicle, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  // ---------------- Handlers ----------------
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) return toast.error("File too large (max 4MB)");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast.error("Invalid file type (JPG, PNG, JPEG only)");

    setForm({ ...form, [name]: file });
  };

  const handleSendOtp = async () => {
    if (!form.phoneNumber) return toast.error("Enter phone number first");
    if (timer > 0) return;
    setSendingOtp(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/otp/send`, { phoneNumber: form.phoneNumber });
      toast.success("OTP sent to SMS");
      setOtpSent(true);
      setTimer(30);
      const countdown = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/otp/verify`, {
        phoneNumber: form.phoneNumber,
        otp,
      });
      if (res.data.success) {
        setOtpVerified(true);
        toast.success("Phone verified successfully");
      } else toast.error("Invalid OTP");
    } catch {
      toast.error("OTP verification failed");
    }
  };

  // ---------------- Razorpay Flow ----------------
  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([key, val]) => val && fd.append(key, val));
    fd.append("vehicleId", id);
    fd.append("city", city);
    fd.append("pickupDate", pickupDate);
    fd.append("dropoffDate", dropoffDate);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (vehicle?.availableCount === 0) return toast.error("Vehicle not available");
    if (!otpVerified) return toast.error("Verify phone number first");
    if (!termsAccepted) return toast.error("Please agree to the Terms & Conditions");
    setLoading(true);

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/payments/create-order`, {
        pickupDate,
        dropoffDate,
        pricePerDay: vehicle?.rentPerDay || 500,
        userId: form.userId,
        vehicleId: id,
      });

      if (!data.success) return toast.error("Error creating payment order");

      if (!window.Razorpay) {
        toast.error("Payment service unavailable");
        setLoading(false);
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
            const formData = buildFormData();
            formData.append("razorpay_order_id", response.razorpay_order_id);
            formData.append("razorpay_payment_id", response.razorpay_payment_id);
            formData.append("razorpay_signature", response.razorpay_signature);

            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL}/payments/verify-payment`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });

            if (verifyRes.data?.success) {
              toast.success("Booking successful!");
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
                    vehicleName: location.state?.vehicleName,
                    vehicleImage: location.state?.vehicleImage,
                  },
                },
              });
            } else toast.error("Payment verification failed");
          } catch {
            toast.error("Error verifying payment");
          }
        },
        prefill: { name: form.name, email: form.email, contact: form.phoneNumber },
        theme: { color: "#0A3D62" },
      };

      new window.Razorpay(options).open();
    } catch {
      toast.error("Payment initiation failed");
    } finally {
      setLoading(false);
    }
  };

  const { chargedDays, chargedHours, subtotal, taxes, handling, total, note } = priceBreakdown;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex justify-center items-start py-12 px-4">
      <Toaster position="top-center" />
      <div className="flex flex-col lg:flex-row w-full max-w-6xl bg-white shadow-xl rounded-2xl overflow-hidden border border-blue-100">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-2/3 p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-[#0A3D62] mb-6">Complete Your Booking</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-400" />

            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email Address" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-400" />

            {/* Phone + OTP */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required pattern="[0-9]{10}" placeholder="10-digit Phone Number" className={`w-full border rounded-lg p-3 ${otpVerified ? "border-green-400 pr-10" : "border-gray-300"}`} />
                {otpVerified && <CheckCircle className="absolute right-3 top-3 text-green-600 w-5 h-5" />}
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || otpVerified || timer > 0}
                className={`px-4 py-3 rounded-lg font-medium text-white transition text-sm sm:text-base ${
                  otpVerified ? "bg-green-600 cursor-default" : "bg-[#0A3D62] hover:bg-sky-700 disabled:opacity-60"
                }`}
              >
                {otpVerified ? "✅ Verified" : sendingOtp ? "Sending..." : timer > 0 ? `Resend in ${timer}s` : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </div>

            {otpSent && !otpVerified && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="flex-1 border border-gray-300 rounded-lg p-3" />
                <button type="button" onClick={handleVerifyOtp} className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition">
                  Verify
                </button>
              </div>
            )}

            {/* Aadhaar Upload */}
            <FileUpload label="Upload ID Proof (Aadhaar / Passport)" name="aadhaarDocument" file={form.aadhaarDocument} onChange={handleFileChange} />

            {/* License Upload */}
            <FileUpload label="Upload Driver’s License" name="licenseDocument" file={form.licenseDocument} onChange={handleFileChange} />

            {/* Terms & Conditions */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>The renter must present a valid driving license at pickup.</li>
                <li>Fuel, traffic fines, and damages are the user’s responsibility.</li>
                <li>Late returns beyond 1 hour will incur additional hourly charges.</li>
                <li>Vehicles must be returned in the same condition as rented.</li>
                 <li>The actual color of the bike or scooter may vary from the images displayed on the website.</li>
                <li>Bookings once confirmed are non-refundable but can be rescheduled.</li>
              </ul>

              <label className="flex items-start mt-3 space-x-2 text-sm text-gray-700">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" />
                <span>I have read and agree to the Terms & Conditions.</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#0A3D62] to-[#3DC1D3] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition">
              {loading ? "Processing..." : "Proceed to Payment"}
            </button>

            <div className="flex items-center justify-center mt-3 text-sm text-gray-600">
              <ShieldCheck className="w-4 h-4 mr-2 text-sky-600" /> 🔒 Your payment is secure and encrypted
            </div>
            <div className="flex justify-center mt-1 space-x-2 opacity-70">
              <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-4" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png" alt="Mastercard" className="h-4" />
              <CreditCard className="w-4 h-4 text-gray-500" />
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-1/3 bg-gradient-to-b from-[#0A3D62] to-[#3DC1D3] text-white p-8 flex flex-col justify-between sticky top-10">
          <div>
            <h3 className="text-xl font-semibold mb-4">Booking Summary</h3>

            {vehicleLoading ? (
              <div className="w-full h-40 bg-white/20 rounded-lg animate-pulse" />
            ) : vehicle ? (
              <>
                <img loading="lazy" decoding="async" src={vehicle.images?.[0] || "https://placehold.co/400x200?text=No+Image"} alt={vehicle.modelName} className="rounded-lg mb-3 w-full h-40 object-contain bg-white/10 p-2" />
                <p className="font-bold text-lg">{vehicle.brand} {vehicle.modelName}</p>
                <p className="text-sm text-white/80">₹{vehicle.rentPerDay} / day</p>
              </>
            ) : (
              <div className="w-full h-40 bg-white/20 rounded-lg flex items-center justify-center text-white/70">Vehicle not found</div>
            )}

            <div className="mt-3 text-sm space-y-1">
              <p><strong>Pickup:</strong> {city} on {pickupDate} {pickupTime}</p>
              <p><strong>Dropoff:</strong> {dropoffDate} {dropoffTime}</p>
              <hr className="my-3 border-white/30" />
              <p>Days charged: <span className="float-right">{chargedDays}</span></p>
              {chargedHours > 0 && <p>Extra hours charged: <span className="float-right">{chargedHours}</span></p>}
              <p className="mt-2">Subtotal: <span className="float-right">₹{subtotal}</span></p>
              <p>Taxes & Fees (18%): <span className="float-right">₹{taxes}</span></p>
              <p>Handling Charges: <span className="float-right">₹{handling}</span></p>
              <p className="font-semibold text-lg mt-2">Total Payable: <span className="float-right font-bold text-white">₹{total}</span></p>
              {note && <p className="text-xs mt-2 opacity-90"><em>{note}</em></p>}
            </div>
          </div>
          <p className="text-xs opacity-80 mt-6 text-center">Need help? Contact us at <strong>contact@newbikeworld.com</strong></p>
        </div>
      </div>
    </div>
  );
};

const FileUpload = ({ label, name, file, onChange }) => (
  <div>
    <label className="block text-gray-700 mb-2 font-medium">{label}</label>
    <label htmlFor={name} className={`flex items-center justify-between border-2 border-dashed rounded-lg p-3 cursor-pointer transition ${file ? "border-green-400 bg-green-50 text-green-700" : "border-blue-300 text-blue-700 hover:bg-blue-50"}`}>
      <div className="flex items-center space-x-2">
        <Upload className={`w-4 h-4 ${file ? "text-green-600" : "text-blue-600"}`} />
        <span>{file ? `✅ ${file.name}` : "Upload File"}</span>
      </div>
      <input id={name} type="file" name={name} accept="image/jpeg, image/png, image/webp" onChange={onChange} className="hidden" required />
    </label>
  </div>
);

export default BookingPage;

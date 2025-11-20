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
    userId: "123", // TODO: replace later
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

  // ⭐ Helmet count: 1 helmet free, 2 helmets = ₹50 + GST
  const [helmetCount, setHelmetCount] = useState(1);

  /* ------------------------------------
        FETCH VEHICLE DETAILS
  ------------------------------------ */
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/vehicles/${id}`
        );
        setVehicle(res.data);
      } catch (err) {
        toast.error("Failed to load vehicle details");
      } finally {
        setVehicleLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  /* ------------------------------------
        PRICE CALCULATION
  ------------------------------------ */
  const computePrice = (
    rentPerDay,
    pickupDateStr,
    pickupTimeStr,
    dropoffDateStr,
    dropoffTimeStr
  ) => {
    const parseDateTime = (d, t) => {
      if (!d) return null;
      const time = t || "00:00";
      return new Date(`${d}T${time}:00`);
    };

    const start = parseDateTime(pickupDateStr, pickupTimeStr);
    const end = parseDateTime(dropoffDateStr, dropoffTimeStr);

    if (!start || !end || end <= start)
      return {
        chargedDays: 0,
        chargedHours: 0,
        subtotal: 0,
        taxes: 0,
        handling: 10,
        helmetCharge: 0,
        helmetGST: 0,
        total: 10,
        note: "Invalid dates",
      };

    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const minsInDay = 1440;

    const daysFull = Math.floor(minutes / minsInDay);
    const remainder = minutes % minsInDay;

    const perHour = rentPerDay / 24;

    let chargedDays = daysFull;
    let chargedHours = 0;
    let subtotal = 0;
    let note = "";

    if (minutes <= minsInDay) {
      subtotal = rentPerDay;
      return {
        chargedDays: 1,
        chargedHours: 0,
        subtotal,
        taxes: Math.round(subtotal * 0.18),
        handling: 10,
        helmetCharge: helmetCount === 2 ? 50 : 0,
        helmetGST: helmetCount === 2 ? Math.round(50 * 0.18) : 0,
        total:
          subtotal +
          Math.round(subtotal * 0.18) +
          10 +
          (helmetCount === 2 ? 50 : 0) +
          (helmetCount === 2 ? Math.round(50 * 0.18) : 0),
        note: "Minimum 1-day price applied",
      };
    }

    if (remainder === 0) {
      subtotal = rentPerDay * chargedDays;
      note = "Exact full days";
    } else if (remainder > 720) {
      chargedDays++;
      subtotal = rentPerDay * chargedDays;
      note = "Remainder > 12 hrs → 1 full extra day";
    } else {
      chargedHours = Math.ceil(remainder / 60);
      subtotal = rentPerDay * chargedDays + perHour * chargedHours;
      note = `${chargedHours} extra hrs charged`;
    }

    const taxes = Math.round(subtotal * 0.18);
    const handling = 10;

    // ⭐ Helmet calculations
    const helmetCharge = helmetCount === 2 ? 50 : 0;
    const helmetGST = helmetCharge > 0 ? Math.round(helmetCharge * 0.18) : 0;

    const total = Math.round(
      subtotal + taxes + handling + helmetCharge + helmetGST
    );

    return {
      chargedDays,
      chargedHours,
      subtotal,
      taxes,
      handling,
      helmetCharge,
      helmetGST,
      total,
      note,
    };
  };

  const priceBreakdown = useMemo(() => {
    if (!vehicle)
      return {
        chargedDays: 0,
        chargedHours: 0,
        subtotal: 0,
        taxes: 0,
        handling: 10,
        helmetCharge: 0,
        helmetGST: 0,
        total: 10,
      };

    return computePrice(
      Number(vehicle.rentPerDay),
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime
    );
  }, [
    vehicle,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    helmetCount, // ⭐ added
  ]);

  /* ------------------------------------
        FORM & OTP HANDLERS
  ------------------------------------ */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files[0]) return;

    const file = files[0];

    if (file.size > 4 * 1024 * 1024)
      return toast.error("Max file size 4MB");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast.error("Invalid file type");

    setForm({ ...form, [name]: file });
  };

  const handleSendOtp = async () => {
    if (!form.phoneNumber) return toast.error("Enter phone first");
    if (timer > 0) return;

    setSendingOtp(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/otp/send`,
        { phoneNumber: form.phoneNumber }
      );
      toast.success("OTP sent");
      setOtpSent(true);
      setTimer(30);

      const interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch {
      toast.error("OTP failed");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/otp/verify`,
        {
          phoneNumber: form.phoneNumber,
          otp,
        }
      );

      if (res.data.success) {
        setOtpVerified(true);
        toast.success("Phone verified");
      } else toast.error("Invalid OTP");
    } catch {
      toast.error("Verification failed");
    }
  };

  /* ------------------------------------
        RAZORPAY + FINAL SUBMIT
  ------------------------------------ */
  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    fd.append("vehicleId", id);
    fd.append("city", city);
    fd.append("pickupDate", pickupDate);
    fd.append("dropoffDate", dropoffDate);
    fd.append("helmetCount", helmetCount);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (vehicle?.availableCount === 0)
      return toast.error("Vehicle not available");

    if (!otpVerified) return toast.error("Verify phone first");
    if (!termsAccepted) return toast.error("Accept T&C");

    setLoading(true);

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/payments/create-order`,
        {
          pickupDate,
          dropoffDate,
          pricePerDay: vehicle?.rentPerDay,
          userId: form.userId,
          vehicleId: id,
          helmetCount, // ⭐ send to backend
        }
      );

      if (!data.success) {
        toast.error("Payment error");
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
            const fd = buildFormData();

            fd.append("razorpay_order_id", response.razorpay_order_id);
            fd.append("razorpay_payment_id", response.razorpay_payment_id);
            fd.append("razorpay_signature", response.razorpay_signature);

            const verifyRes = await axios.post(
              `${import.meta.env.VITE_API_URL}/payments/verify-payment`,
              fd,
              { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (verifyRes.data?.success) {
              toast.success("Booking successful");
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
                    helmetCount,
                  },
                },
              });
            } else toast.error("Payment failed");
          } catch {
            toast.error("Verification failed");
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
      toast.error("Payment start failed");
    } finally {
      setLoading(false);
    }
  };

  const {
    chargedDays,
    chargedHours,
    subtotal,
    taxes,
    handling,
    helmetCharge,
    helmetGST,
    total,
    note,
  } = priceBreakdown;

  /* ------------------------------------
        UI START
  ------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex justify-center items-start py-12 px-4">
      <Toaster position="top-center" />

      <div className="flex flex-col lg:flex-row w-full max-w-6xl bg-white shadow-xl rounded-2xl overflow-hidden border border-blue-100">

        {/* LEFT COLUMN */}
        <div className="w-full lg:w-2/3 p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-[#0A3D62] mb-6">Complete Your Booking</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required className="w-full border border-gray-300 rounded-lg p-3" />

            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email Address" required className="w-full border border-gray-300 rounded-lg p-3" />

            {/* Phone + OTP */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  placeholder="Phone Number"
                  className={`w-full border rounded-lg p-3 ${otpVerified ? "border-green-400 pr-10" : "border-gray-300"}`}
                />
                {otpVerified && <CheckCircle className="absolute right-3 top-3 text-green-600 w-5 h-5" />}
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || otpVerified || timer > 0}
                className="px-4 py-3 rounded-lg text-white bg-[#0A3D62]"
              >
                {otpVerified
                  ? "Verified"
                  : sendingOtp
                  ? "Sending..."
                  : timer > 0
                  ? `Resend in ${timer}s`
                  : "Send OTP"}
              </button>
            </div>

            {otpSent && !otpVerified && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="flex-1 border border-gray-300 rounded-lg p-3"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="px-4 bg-green-600 text-white rounded-lg"
                >
                  Verify
                </button>
              </div>
            )}

            {/* Aadhaar Upload */}
            <FileUpload label="Upload ID Proof (Aadhaar / Passport)" name="aadhaarDocument" file={form.aadhaarDocument} onChange={handleFileChange} />

            {/* License Upload */}
            <FileUpload label="Upload Driving License" name="licenseDocument" file={form.licenseDocument} onChange={handleFileChange} />

            {/* ⭐ HELMET SELECTION */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Helmet Options</h4>

              <select
                value={helmetCount}
                onChange={(e) => setHelmetCount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value={1}>1 Helmet (Free)</option>
                <option value={2}>2 Helmets (+₹50 + GST)</option>
              </select>

              <p className="text-sm mt-2 text-gray-600">
                First helmet is free. Second helmet costs <strong>₹50 + 18% GST</strong>.
              </p>
            </div>

            {/* Terms */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
              <ul className="text-sm list-disc list-inside text-gray-600 space-y-1">
                <li>Valid driving license must be shown.</li>
                <li>Fuel, fines & damages are customer responsibility.</li>
                <li>Late return incurs hourly charge.</li>
                <li>Return vehicle in same condition.</li>
                <li>Actual bike color may vary.</li>
                <li>Non-refundable bookings; rescheduling allowed.</li>
              </ul>

              <label className="flex items-start mt-3 space-x-2 text-sm text-gray-700">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                <span>I agree to Terms & Conditions.</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#0A3D62] text-white py-3 rounded-lg">
              {loading ? "Processing..." : "Proceed to Payment"}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN — SUMMARY */}
        <div className="w-full lg:w-1/3 bg-gradient-to-b from-[#0A3D62] to-[#3DC1D3] text-white p-8 sticky top-10">
          <h3 className="text-xl font-semibold mb-4">Booking Summary</h3>

          {vehicleLoading ? (
            <div className="w-full h-40 bg-white/20 rounded-lg animate-pulse" />
          ) : vehicle ? (
            <>
              <img src={vehicle.images?.[0]} className="rounded-lg mb-3 w-full h-40 object-contain bg-white/10 p-2" />
              <p className="font-bold text-lg">{vehicle.brand} {vehicle.modelName}</p>
              <p className="text-sm text-white/80">₹{vehicle.rentPerDay} / day</p>
            </>
          ) : (
            <div>Vehicle not found</div>
          )}

          <div className="mt-3 text-sm space-y-1">
            <p><strong>Pickup:</strong> {city} • {pickupDate} {pickupTime}</p>
            <p><strong>Dropoff:</strong> {dropoffDate} {dropoffTime}</p>

            <hr className="my-3 border-white/30" />

            <p>Days charged: <span className="float-right">{chargedDays}</span></p>
            {chargedHours > 0 && (
              <p>Extra Hours: <span className="float-right">{chargedHours}</span></p>
            )}

            <p className="mt-2">Subtotal: <span className="float-right">₹{subtotal}</span></p>
            <p>Taxes (18%): <span className="float-right">₹{taxes}</span></p>
            <p>Handling: <span className="float-right">₹{handling}</span></p>

            {/* ⭐ Helmet summary */}
            {helmetCharge > 0 && (
              <>
                <p>Helmet Charge: <span className="float-right">₹{helmetCharge}</span></p>
                <p>Helmet GST: <span className="float-right">₹{helmetGST}</span></p>
              </>
            )}

            <p className="font-semibold text-lg mt-2">
              Total Payable: <span className="float-right font-bold text-white">₹{total}</span>
            </p>

            {note && <p className="text-xs opacity-80 mt-2"><em>{note}</em></p>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------
        FILE UPLOAD COMPONENT
------------------------------------ */
const FileUpload = ({ label, name, file, onChange }) => (
  <div>
    <label className="block text-gray-700 mb-2 font-medium">{label}</label>
    <label
      htmlFor={name}
      className={`flex items-center justify-between border-2 border-dashed rounded-lg p-3 cursor-pointer ${
        file ? "border-green-400 bg-green-50 text-green-700" : "border-blue-300 text-blue-700"
      }`}
    >
      <div className="flex items-center space-x-2">
        <Upload className={`w-4 h-4 ${file ? "text-green-600" : "text-blue-600"}`} />
        <span>{file ? `Uploaded: ${file.name}` : "Upload File"}</span>
      </div>
      <input id={name} type="file" name={name} accept="image/*" onChange={onChange} className="hidden" required />
    </label>
  </div>
);

export default BookingPage;

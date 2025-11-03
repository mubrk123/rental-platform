import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { loadRazorpayScript } from "../lib/loadRazorpay";
const PaymentPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const {
    vehicle,
    city,
    pickupDate,
    dropoffDate,
    name,
    email,
    phoneNumber,
    aadhaarDocument,
    licenseDocument,
    pricePerDay,
    userId,
  } = state || {};

  if (!vehicle)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600">No booking details found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );

  const days =
    (new Date(dropoffDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24);

  const baseFare = days * pricePerDay;
  const helmetCharge = 50;
  const tax = 0.18 * baseFare;
  const total = baseFare + helmetCharge + tax;

 const handlePayment = async () => {
  // ✅ Step 1: Dynamically load the Razorpay script
  const res = await loadRazorpayScript();
  if (!res) {
    alert("Failed to load Razorpay SDK. Please check your connection.");
    return;
  }

  try {
    // ✅ Step 2: Create order on backend
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL}/payments/create-order`,
      {
        amount: total,
        pickupDate,
        dropoffDate,
        pricePerDay,
        userId,
        vehicleId: id,
      }
    );

    if (!data.success) {
      alert("Error creating payment order");
      return;
    }

    const { order } = data;

    // ✅ Step 3: Configure Razorpay options
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Rental Platform",
      description: "Booking Payment",
      order_id: order.id,
      handler: async (response) => {
        try {
          const verifyRes = await axios.post(
            `${import.meta.env.VITE_API_URL}/payments/verify-payment`,
            response
          );

          if (verifyRes.data.success) {
            const formData = new FormData();
            formData.append("userId", userId);
            formData.append("vehicleId", id);
            formData.append("city", city);
            formData.append("pickupDate", pickupDate);
            formData.append("dropoffDate", dropoffDate);
            formData.append("name", name);
            formData.append("email", email);
            formData.append("phoneNumber", phoneNumber);
            if (aadhaarDocument)
              formData.append("aadhaarDocument", aadhaarDocument);
            if (licenseDocument)
              formData.append("licenseDocument", licenseDocument);

            await axios.post(
              `${import.meta.env.VITE_API_URL}/bookings/create`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              }
            );

            navigate("/booking-success", {
              state: {
                booking: {
                  vehicleId: id,
                  city,
                  pickupDate,
                  dropoffDate,
                  name,
                  phoneNumber,
                },
              },
            });
          } else {
            alert("Payment verification failed");
          }
        } catch (err) {
          console.error("Verification error:", err);
          alert("Error verifying payment");
        }
      },
      prefill: {
        name,
        email,
        contact: phoneNumber,
      },
      theme: { color: "#8b5cf6" },
    };

    // ✅ Step 4: Open Razorpay Checkout
    const razor = new window.Razorpay(options);
    razor.open();
  } catch (error) {
    console.error("Payment error:", error);
    alert("Something went wrong during payment.");
  }
};
  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple-50 to-pink-50 py-12">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md border border-purple-100">
        <h2 className="text-3xl font-bold mb-6 text-purple-700 text-center">
          Payment Preview
        </h2>

        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Vehicle:</strong> {vehicle.modelName} ({vehicle.brand})
          </p>
          <p>
            <strong>Duration:</strong> {days} day(s)
          </p>
          <hr />
          <p>
            <span>Base Fare ({days} × ₹{pricePerDay})</span>
            <span className="float-right font-semibold">
              ₹{baseFare.toFixed(2)}
            </span>
          </p>
          <p>
            <span>Helmet Charge</span>
            <span className="float-right font-semibold">₹{helmetCharge}</span>
          </p>
          <p>
            <span>GST (18%)</span>
            <span className="float-right font-semibold">₹{tax.toFixed(2)}</span>
          </p>
          <hr />
          <p className="text-lg font-bold text-purple-700">
            <span>Total Amount</span>
            <span className="float-right">₹{total.toFixed(2)}</span>
          </p>
        </div>

        <button
          onClick={handlePayment}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-semibold hover:brightness-110 hover:scale-[1.02] transition-all"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  );
};

export default PaymentPreview;

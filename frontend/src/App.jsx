// 📁 src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import LandingPage from "./pages/user/Dashboard";
import Vehicles from "./pages/Vehicles";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BookingPage from "./pages/BookingPage";
import BookingSuccess from "./pages/BookingSuccess";
import PaymentPreview from "./pages/PaymentPreview";
import AdminLogin from "./pages/admin/AdminLogin"; // ✅ Added
import { loadRazorpayScript } from "./lib/loadRazorpay";

// ✅ Wrapper to protect admin-only pages
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    window.location.href = "/admin-login";
    return null;
  }

  try {
    // optional lightweight expiry check
    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = Date.now() >= payload.exp * 1000;
    if (isExpired) {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin-login";
      return null;
    }
  } catch (err) {
    console.error("Invalid token:", err);
    localStorage.removeItem("adminToken");
    window.location.href = "/admin-login";
    return null;
  }

  return children;
};

function App() {
  // ✅ Preload Razorpay script once when app starts
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* 🧍‍♂️ User Side */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/booking/:id" element={<BookingPage />} />
        <Route path="/payment-preview/:id" element={<PaymentPreview />} />
        <Route path="/booking-success" element={<BookingSuccess />} />

        {/* 🛡️ Admin Side */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

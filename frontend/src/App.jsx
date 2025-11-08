// 📁 src/App.jsx
import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { loadRazorpayScript } from "./lib/loadRazorpay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ Global React Query Client (for caching & data optimization)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000, // Cache for 2 minutes
      refetchOnWindowFocus: false, // Prevent refetch on tab switch
    },
  },
});

// 🛡️ Protect Admin Route
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    window.location.href = "/admin-login";
    return null;
  }

  try {
    // Decode JWT payload and check expiry
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

// 🚀 Lazy-loaded route components (bundle-split by page)
const LandingPage = lazy(() => import("./pages/user/Dashboard"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
//const PaymentPreview = lazy(() => import("./pages/PaymentPreview"));
const AllSaleBikes = lazy(() => import("./pages/AllSaleBikes"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

function App() {
  // ⚙️ Preload Razorpay SDK once on startup
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen flex justify-center items-center text-sky-600 font-semibold">
              Loading...
            </div>
          }
        >
          <Routes>
            {/* 🧍‍♂️ User Side */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/booking/:id" element={<BookingPage />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/sale-bikes" element={<AllSaleBikes />} />

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
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

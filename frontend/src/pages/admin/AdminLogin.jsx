// pages/admin/AdminLogin.jsx
import React, { useState } from "react";
import axios from "axios";
import { Lock, Mail } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/admin/login`, {
        email,
        password,
      });

      // ✅ Save the token if present
      if (data?.token) {
        localStorage.setItem("adminToken", data.token);
        window.location.href = "/admin"; // redirect to admin panel
      } else {
        setError(data?.message || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid credentials or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple-600 via-indigo-500 to-purple-700">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border border-gray-100"
      >
        <h2 className="text-3xl font-extrabold text-center text-indigo-700 mb-6">
          Admin Login
        </h2>

        {error && (
          <div className="mb-4 bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-1 font-medium">Email</label>
          <div className="flex items-center border rounded-lg p-2">
            <Mail className="text-gray-400 w-5 h-5 mr-2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@newbikeworld.in"
              className="w-full outline-none text-sm"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-1 font-medium">Password</label>
          <div className="flex items-center border rounded-lg p-2">
            <Lock className="text-gray-400 w-5 h-5 mr-2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full outline-none text-sm"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Authorized access only © NewBikeWorld
        </p>
      </form>
    </div>
  );
};

export default AdminLogin;

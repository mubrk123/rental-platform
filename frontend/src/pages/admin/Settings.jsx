import React, { useState, useEffect } from "react";
import axios from "axios";
import { KeyRound, Mail, Eye, EyeOff, Check, Pencil, X, ShieldCheck, User } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("adminToken")}` });

const CredentialCard = ({ cred, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(cred.email || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleOpen = () => {
    setEmail(cred.email || "");
    setPassword(""); setConfirm("");
    setError(""); setSuccess("");
    setOpen(true);
  };

  const handleCancel = () => { setOpen(false); setError(""); setSuccess(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (password && password !== confirm) return setError("Passwords do not match");
    if (password && password.length < 6) return setError("Password must be at least 6 characters");
    if (!email && !password) return setError("Provide email or password to update");

    setLoading(true);
    try {
      const payload = {};
      if (email) payload.email = email;
      if (password) payload.password = password;
      await axios.put(`${API}/admin/credentials/${cred._id}`, payload, { headers: authHeader() });
      setSuccess("Updated successfully");
      setPassword(""); setConfirm("");
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const isMainAdmin = cred.role === "mainAdmin";

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${isMainAdmin ? "border-blue-200" : "border-gray-100"} overflow-hidden`}>
      {/* Card Header */}
      <div className={`px-5 py-4 flex items-center justify-between ${isMainAdmin ? "bg-gradient-to-r from-[#0E3A61] to-[#1E88E5]" : "bg-gray-50 border-b border-gray-100"}`}>
        <div className="flex items-center gap-3">
          {isMainAdmin
            ? <ShieldCheck className="w-5 h-5 text-white" />
            : <User className="w-5 h-5 text-gray-500" />}
          <div>
            <p className={`font-semibold text-sm ${isMainAdmin ? "text-white" : "text-gray-800"}`}>
              {isMainAdmin ? "Main Admin" : cred.locationName || "Handler"}
            </p>
            <p className={`text-xs ${isMainAdmin ? "text-blue-100" : "text-gray-400"}`}>
              {isMainAdmin ? "Full access" : "Branch handler"}
            </p>
          </div>
        </div>
        {!open && (
          <button onClick={handleOpen}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${isMainAdmin ? "bg-white/20 text-white hover:bg-white/30" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
            <Pencil className="w-3 h-3" /> Change
          </button>
        )}
        {open && (
          <button onClick={handleCancel} className={`text-xs ${isMainAdmin ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Current credentials display */}
      {!open && (
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{cred.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <KeyRound className="w-4 h-4" />
            <span>••••••••</span>
          </div>
        </div>
      )}

      {/* Edit form */}
      {open && (
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs flex items-center gap-1"><Check className="w-3 h-3" />{success}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full pl-8 pr-8 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
            <div className="relative">
              <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input type={showPass ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className="w-full pl-8 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#0E3A61] text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition disabled:opacity-60">
              {loading ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const Settings = () => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = async () => {
    try {
      const res = await axios.get(`${API}/admin/credentials`, { headers: authHeader() });
      setCredentials(res.data.credentials || []);
    } catch (err) {
      console.error("Failed to fetch credentials:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCredentials(); }, []);

  const mainAdmin = credentials.find((c) => c.role === "mainAdmin");
  const handlers = credentials.filter((c) => c.role === "handler");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
        <h2 className="text-2xl font-bold text-[#0E3A61]">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage login credentials for all admin accounts</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading credentials...</div>
      ) : (
        <>
          {/* Main Admin */}
          {mainAdmin && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Main Admin</h3>
              <div className="max-w-sm">
                <CredentialCard cred={mainAdmin} onSaved={fetchCredentials} />
              </div>
            </div>
          )}

          {/* Branch Handlers */}
          {handlers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Branch Handlers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {handlers.map((cred) => (
                  <CredentialCard key={cred._id} cred={cred} onSaved={fetchCredentials} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;

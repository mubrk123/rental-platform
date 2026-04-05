import React, { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check, MapPin, Phone, User } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("adminToken")}` });

const emptyForm = {
  name: "", locationCode: "", address: "",
  mapsLink: "", handlerName: "", handlerPhone: "", isActive: true,
  handlerEmail: "", handlerPassword: "",
};

const BranchManager = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await axios.get(`${API}/locations`, { headers: authHeader() });
      return res.data.locations;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => axios.post(`${API}/locations`, data, { headers: authHeader() }),
    onSuccess: () => { queryClient.invalidateQueries(["locations"]); resetForm(); },
    onError: (err) => setError(err.response?.data?.message || "Failed to create branch"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => axios.put(`${API}/locations/${id}`, data, { headers: authHeader() }),
    onSuccess: () => { queryClient.invalidateQueries(["locations"]); resetForm(); },
    onError: (err) => setError(err.response?.data?.message || "Failed to update branch"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`${API}/locations/${id}`, { headers: authHeader() }),
    onSuccess: () => queryClient.invalidateQueries(["locations"]),
    onError: (err) => setError(err.response?.data?.message || "Failed to delete branch"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => axios.put(`${API}/locations/${id}`, { isActive }, { headers: authHeader() }),
    onSuccess: () => queryClient.invalidateQueries(["locations"]),
  });

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); setError(""); };

  const handleEdit = (loc) => {
    setForm({
      name: loc.name, locationCode: loc.locationCode, address: loc.address,
      mapsLink: loc.mapsLink || "", handlerName: loc.handlerName || "",
      handlerPhone: loc.handlerPhone || "", isActive: loc.isActive,
    });
    setEditingId(loc._id);
    setShowForm(true);
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.locationCode || !form.address)
      return setError("Name, location code and address are required");
    if (editingId) updateMutation.mutate({ id: editingId, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete branch "${name}"? This cannot be undone.`))
      deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl p-5 shadow-sm border border-blue-100">
        <div>
          <h2 className="text-2xl font-bold text-[#0E3A61]">Branch Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Add, edit or remove pickup branches and handler details</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#0E3A61] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition"
        >
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#0E3A61]">
              {editingId ? "Edit Branch" : "New Branch"}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
              <input
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Lalbagh" required
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Code * (3 letters)</label>
              <input
                value={form.locationCode} onChange={(e) => setForm({ ...form, locationCode: e.target.value.toUpperCase() })}
                placeholder="e.g. LBG" maxLength={5} required
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address" required
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
              <input
                value={form.mapsLink} onChange={(e) => setForm({ ...form, mapsLink: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handler Name</label>
              <input
                value={form.handlerName} onChange={(e) => setForm({ ...form, handlerName: e.target.value })}
                placeholder="Handler's full name"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handler Phone</label>
              <input
                value={form.handlerPhone} onChange={(e) => setForm({ ...form, handlerPhone: e.target.value })}
                placeholder="+919876543210"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            {!editingId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handler Login Email</label>
                  <input
                    value={form.handlerEmail} onChange={(e) => setForm({ ...form, handlerEmail: e.target.value })}
                    placeholder="handler@newbikeworld.in" type="email"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handler Login Password</label>
                  <input
                    value={form.handlerPassword} onChange={(e) => setForm({ ...form, handlerPassword: e.target.value })}
                    placeholder="Min 6 characters" type="password"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox" id="isActive" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible to customers)</label>
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 bg-[#0E3A61] text-white px-5 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {editingId ? "Save Changes" : "Create Branch"}
              </button>
              <button type="button" onClick={resetForm} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branch Cards */}
      {isLoading ? (
        <div className="text-center text-gray-500 py-10">Loading branches...</div>
      ) : data?.length === 0 ? (
        <div className="text-center text-gray-500 py-10">No branches yet. Add one above.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.map((loc) => (
            <div key={loc._id} className={`bg-white rounded-xl p-5 shadow-sm border ${loc.isActive ? "border-blue-100" : "border-gray-200 opacity-60"}`}>
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mb-1">
                    {loc.locationCode}
                  </span>
                  <h3 className="text-base font-bold text-[#0E3A61]">{loc.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleMutation.mutate({ id: loc._id, isActive: !loc.isActive })}
                    title={loc.isActive ? "Deactivate" : "Activate"}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition ${loc.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {loc.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>{loc.address}</span>
                </p>
                {loc.mapsLink && (
                  <a href={loc.mapsLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-500 hover:underline text-xs">
                    <MapPin className="w-3 h-3" /> View on Maps
                  </a>
                )}
                {loc.handlerName && (
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{loc.handlerName}</span>
                  </p>
                )}
                {loc.handlerPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{loc.handlerPhone}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(loc)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(loc._id, loc.name)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchManager;

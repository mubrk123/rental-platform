import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Trash2,
  Loader2,
  MapPin,
  Filter,
  Edit2,
  X,
  CalendarDays,
  UploadCloud,
  Gauge,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const LOCATIONS = [
  "All Locations",
  "Lalbagh",
  "NagaVara",
  "Residency Road",
  "Majestic (Gandhi Nagar)",
];

const UploadedVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const [editingVehicle, setEditingVehicle] = useState(null);

  const [formData, setFormData] = useState({
    modelName: "",
    brand: "",
    rentPerDay: "",
    totalQuantity: "",
    city: LOCATIONS[1],
    type: "bike",
    kmLimitPerDay: "",
  });

  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);

  const [bookingsModal, setBookingsModal] = useState({
    open: false,
    loading: false,
    data: [],
    vehicle: null,
  });

  const adminHeaders = useMemo(() => {
    const token = localStorage.getItem("adminToken");
    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  /* ------------------------------------------------------------------
   * FETCH VEHICLES
   ------------------------------------------------------------------ */
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/vehicles`, {
        headers: adminHeaders,
      });
      setVehicles(res.data || []);
      setFilteredVehicles(res.data || []);
    } catch (err) {
      toast.error("Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  /* ------------------------------------------------------------------
   * LOCATION FILTER
   ------------------------------------------------------------------ */
  const handleLocationFilter = (location) => {
    setSelectedLocation(location);
    if (location === "All Locations") return setFilteredVehicles(vehicles);

    setFilteredVehicles(
      vehicles.filter(
        (v) => v.city === location || v.location?.city === location
      )
    );
  };

  /* ------------------------------------------------------------------
   * DELETE VEHICLE
   ------------------------------------------------------------------ */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/vehicles/${id}`, {
        headers: adminHeaders,
      });

      setVehicles((prev) => prev.filter((v) => v._id !== id));
      setFilteredVehicles((prev) => prev.filter((v) => v._id !== id));
      toast.success("Vehicle deleted!");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  /* ------------------------------------------------------------------
   * OPEN EDIT FORM
   ------------------------------------------------------------------ */
  const openEditForm = (vehicle) => {
    setEditingVehicle(vehicle);

    setFormData({
      modelName: vehicle.modelName,
      brand: vehicle.brand,
      rentPerDay: String(vehicle.rentPerDay),
      totalQuantity: String(vehicle.totalQuantity),
      city: vehicle.city || vehicle.location?.city || LOCATIONS[1],
      type: vehicle.type,
      kmLimitPerDay: String(vehicle.kmLimitPerDay || 150),
    });

    setImages([]);
    setPreview(vehicle.images || []);
  };

  /* ------------------------------------------------------------------
   * FORM INPUT HANDLER — FIXED
   ------------------------------------------------------------------ */
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    // ✔ Store number fields as plain strings to prevent React from messing input
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ------------------------------------------------------------------
   * IMAGE HANDLER
   ------------------------------------------------------------------ */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreview([...preview, ...files.map((f) => URL.createObjectURL(f))]);
  };

  /* ------------------------------------------------------------------
   * UPDATE VEHICLE — FIXED NUMERIC CONVERSION
   ------------------------------------------------------------------ */
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;

    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (["rentPerDay", "totalQuantity", "kmLimitPerDay"].includes(key)) {
        data.append(key, Number(value).toString()); // convert here only
      } else {
        data.append(key, value);
      }
    });

    images.forEach((img) => data.append("images", img));

    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/vehicles/${editingVehicle._id}`,
        data,
        {
          headers: {
            ...adminHeaders,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data?.success) {
        toast.success("Vehicle updated!");

        // refresh updated vehicle
        const updated = await axios.get(
          `${import.meta.env.VITE_API_URL}/vehicles/${editingVehicle._id}`,
          { headers: adminHeaders }
        );

        const updatedVehicle = updated.data;

        setVehicles((prev) =>
          prev.map((v) => (v._id === editingVehicle._id ? updatedVehicle : v))
        );

        setFilteredVehicles((prev) =>
          prev.map((v) => (v._id === editingVehicle._id ? updatedVehicle : v))
        );

        setEditingVehicle(null);
      } else {
        toast.error("Update failed.");
      }
    } catch (err) {
      toast.error("Server error.");
    }
  };

  /* ------------------------------------------------------------------
   * VIEW BOOKINGS
   ------------------------------------------------------------------ */
  const handleViewBookings = async (vehicle) => {
    setBookingsModal({ open: true, loading: true, data: [], vehicle });

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/bookings/upcoming/${vehicle._id}`,
        { headers: adminHeaders }
      );

      const bookings = Array.isArray(res.data?.bookings)
        ? res.data.bookings
        : res.data || [];

      setBookingsModal({
        open: true,
        loading: false,
        data: bookings,
        vehicle,
      });
    } catch (err) {
      setBookingsModal({
        open: true,
        loading: false,
        data: [],
        vehicle,
        error: true,
      });
    }
  };

  /* ------------------------------------------------------------------
   * UI (Unchanged)
   ------------------------------------------------------------------ */
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-indigo-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading uploaded
        vehicles...
      </div>
    );

  return (
    <div className="bg-white shadow-md rounded-lg p-6 relative">
      <Toaster position="top-center" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-indigo-600 text-center sm:text-left mb-4 sm:mb-0">
          Uploaded Vehicles
        </h2>

        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          <select
            value={selectedLocation}
            onChange={(e) => handleLocationFilter(e.target.value)}
            className="border border-indigo-300 text-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID */}
      {filteredVehicles.length === 0 ? (
        <p className="text-center text-gray-500">
          No vehicles found for this location.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => (
            <div
              key={v._id}
              className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
            >
              <img
                src={v.images?.[0] || "https://placehold.co/400x200?text=No+Image"}
                alt={v.modelName}
                className="w-full h-40 object-cover"
                loading="lazy"
              />

              <div className="p-4">
                <h3 className="text-lg font-bold text-indigo-700 mb-1">
                  {v.modelName}
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  {v.brand} • {v.type}
                </p>
                <p className="flex items-center text-xs text-gray-500 mb-1">
                  <MapPin className="w-4 h-4 mr-1 text-red-500" />
                  {v.city || v.location?.city}
                </p>
                <p className="text-gray-700 text-sm font-semibold">
                  ₹{v.rentPerDay} / day
                </p>
                <p className="text-xs text-gray-600 mt-1 flex items-center">
                  <Gauge className="w-4 h-4 mr-1 text-sky-500" />
                  {v.kmLimitPerDay ? `${v.kmLimitPerDay} km/day` : "150 km/day"}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Available:{" "}
                  <span
                    className={`font-bold ${
                      v.availableCount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {v.availableCount}
                  </span>{" "}
                  Total: {v.totalQuantity}
                </p>

                <button
                  onClick={() => handleViewBookings(v)}
                  className="mt-3 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-all"
                >
                  <CalendarDays className="w-4 h-4" /> View Upcoming Bookings
                </button>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEditForm(v)}
                    className="w-1/2 bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600 transition text-sm flex items-center justify-center"
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v._id)}
                    className="w-1/2 bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition text-sm flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingVehicle(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-indigo-700 mb-4">
              Edit Vehicle
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  name="modelName"
                  value={formData.modelName}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Per Day (₹)
                </label>
                <input
                  type="number"
                  name="rentPerDay"
                  value={formData.rentPerDay}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Quantity
                </label>
                <input
                  type="number"
                  name="totalQuantity"
                  value={formData.totalQuantity}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                >
                  {LOCATIONS.filter((l) => l !== "All Locations").map(
                    (loc) => (
                      <option key={loc}>{loc}</option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                >
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KM Limit Per Day
                </label>
                <input
                  type="number"
                  name="kmLimitPerDay"
                  value={formData.kmLimitPerDay}
                  onChange={handleFormChange}
                  className="border rounded-lg p-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Images (optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="border rounded-lg p-2 w-full"
                />
              </div>

              {preview.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {preview.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`preview-${i}`}
                      className="w-full h-28 object-cover rounded-md border"
                    />
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadedVehicles;

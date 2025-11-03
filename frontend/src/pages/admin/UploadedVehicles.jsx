// frontend/src/pages/admin/UploadedVehicles.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, Loader2, MapPin, Filter, Edit2, X, ChevronDown, ChevronUp } from "lucide-react";

const LOCATIONS = [
  "All Locations",
  "Lalbagh",
  "NagaVara",
  "Residency Road",
  "Gandhi Nagar",
];

const UploadedVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    modelName: "",
    brand: "",
    rentPerDay: "",
    totalQuantity: "",
    availableCount: "",
    city: "",
    type: "bike",
  });
  const [upcomingBookings, setUpcomingBookings] = useState({});
  const [expandedVehicleId, setExpandedVehicleId] = useState(null);

  // ✅ Fetch all vehicles
  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/vehicles`, {
        headers: { "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET },
      });
      setVehicles(res.data || []);
      setFilteredVehicles(res.data || []);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setMessage("❌ Failed to load vehicles. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ✅ Fetch upcoming bookings for a vehicle
  const fetchUpcomingBookings = async (vehicleId) => {
    try {
      // Toggle expand/collapse
      if (expandedVehicleId === vehicleId) {
        setExpandedVehicleId(null);
        return;
      }
      setExpandedVehicleId(vehicleId);

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/vehicles/${vehicleId}/bookings/upcoming`,
        { headers: { "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET } }
      );
      setUpcomingBookings((prev) => ({ ...prev, [vehicleId]: res.data || [] }));
    } catch (err) {
      console.error("Error fetching upcoming bookings:", err);
    }
  };

  const handleLocationFilter = (location) => {
    setSelectedLocation(location);
    if (location === "All Locations") {
      setFilteredVehicles(vehicles);
    } else {
      const filtered = vehicles.filter((v) => v.location?.city === location);
      setFilteredVehicles(filtered);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/vehicles/${id}`, {
        headers: { "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET },
      });
      setVehicles((prev) => prev.filter((v) => v._id !== id));
      setFilteredVehicles((prev) => prev.filter((v) => v._id !== id));
      setMessage("✅ Vehicle deleted successfully!");
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      setMessage("❌ Failed to delete vehicle.");
    }
  };

  const openEditForm = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      modelName: vehicle.modelName,
      brand: vehicle.brand,
      rentPerDay: vehicle.rentPerDay,
      totalQuantity: vehicle.totalQuantity,
      availableCount: vehicle.availableCount,
      city: vehicle.location?.city || "",
      type: vehicle.type,
    });
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/vehicles/${editingVehicle._id}`,
        formData,
        {
          headers: { "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET },
        }
      );
      setMessage("✅ Vehicle updated successfully!");
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      console.error("Update failed:", err);
      setMessage("❌ Update failed. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-indigo-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading uploaded vehicles...
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 relative">
      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-indigo-600 text-center sm:text-left mb-4 sm:mb-0">
          Uploaded Vehicles
        </h2>

        {/* --- Location Filter Dropdown --- */}
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          <select
            value={selectedLocation}
            onChange={(e) => handleLocationFilter(e.target.value)}
            className="border border-indigo-300 text-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className="text-center mb-4 text-sm font-semibold bg-indigo-50 text-gray-700 p-2 rounded">
          {message}
        </div>
      )}

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
                  {v.location?.city}
                </p>
                <p className="text-gray-700 text-sm font-semibold">
                  ₹{v.rentPerDay} / day
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
                  / {v.totalQuantity}
                </p>

                {/* --- Upcoming Bookings Toggle --- */}
                <button
                  onClick={() => fetchUpcomingBookings(v._id)}
                  className="text-xs text-indigo-600 underline mt-2 flex items-center hover:text-indigo-800"
                >
                  {expandedVehicleId === v._id ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" /> Hide Upcoming Bookings
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" /> View Upcoming Bookings
                    </>
                  )}
                </button>

                {expandedVehicleId === v._id && (
                  <div className="mt-2 bg-indigo-50 rounded-lg p-2 text-xs text-gray-700 space-y-1 border border-indigo-100">
                    {upcomingBookings[v._id] ? (
                      upcomingBookings[v._id].length === 0 ? (
                        <p className="text-gray-500 text-center">
                          No upcoming bookings.
                        </p>
                      ) : (
                        upcomingBookings[v._id].map((b) => (
                          <div key={b._id} className="flex justify-between">
                            <span>{b.name || "—"}</span>
                            <span>
                              {new Date(b.pickupDate).toLocaleDateString()} →{" "}
                              {new Date(b.dropoffDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )
                    ) : (
                      <p className="text-gray-500 text-center">
                        Loading upcoming bookings...
                      </p>
                    )}
                  </div>
                )}

                {/* --- Buttons --- */}
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

      {/* --- Edit Modal --- */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              onClick={() => setEditingVehicle(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-indigo-600 mb-4">
              Edit Vehicle
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    name="modelName"
                    placeholder="Model Name"
                    value={formData.modelName}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                    required
                  />
                </div>

                <div>
                  <input
                    name="brand"
                    placeholder="Brand"
                    value={formData.brand}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                    required
                  />
                </div>

                <div>
                  <input
                    type="number"
                    name="rentPerDay"
                    placeholder="Rent Per Day"
                    value={formData.rentPerDay}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                    required
                  />
                </div>

                <div>
                  <input
                    type="number"
                    name="totalQuantity"
                    placeholder="Total Quantity"
                    value={formData.totalQuantity}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                    required
                  />
                </div>

                <div>
                  <input
                    type="number"
                    name="availableCount"
                    placeholder="Available Count"
                    value={formData.availableCount}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                    required
                  />
                </div>

                <div>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                  >
                    {LOCATIONS.filter((l) => l !== "All Locations").map((loc) => (
                      <option key={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    className="border rounded-lg p-2 w-full"
                  >
                    <option value="bike">bike</option>
                    <option value="scooter">scooter</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Update Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadedVehicles;

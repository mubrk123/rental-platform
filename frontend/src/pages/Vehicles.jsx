import React, { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../assets/logo.jpg";

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    brand: "",
    sortBy: "",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const city = params.get("city") || "Bangalore";
  const pickupDate = params.get("pickupDate") || "27 Oct 2025";
  const dropoffDate = params.get("dropoffDate") || "29 Oct 2025";
  const pickupTime = params.get("pickupTime") || "9:00 AM";
  const dropoffTime = params.get("dropoffTime") || "10:00 AM";

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/vehicles?city=${city}`
      );
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [city]);

  // Refresh after successful booking (triggered by BookingSuccess)
  useEffect(() => {
    if (location.state?.refresh) fetchVehicles();
  }, [location.state]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const filteredVehicles = vehicles
    .filter((v) => {
      if (filters.type && v.type !== filters.type) return false;
      if (filters.brand && v.brand !== filters.brand) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "priceLow") return a.rentPerDay - b.rentPerDay;
      if (filters.sortBy === "priceHigh") return b.rentPerDay - a.rentPerDay;
      return 0;
    });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sky-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2 font-medium">Loading vehicles...</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-700 to-sky-500 text-white py-5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <img
              src={Logo}
              alt="NewBikeWorld Logo"
              className="w-12 h-12 rounded-full shadow-md"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                NewBike<span className="text-sky-300">World</span>
              </h1>
              <p className="text-sm text-sky-100 italic">
                Your Journey, Our Bikes 🚲
              </p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm">
              Showing results for{" "}
              <span className="font-semibold text-sky-200">{city}</span>
            </p>
            <p className="text-xs text-sky-100">
              {pickupDate} {pickupTime} → {dropoffDate} {dropoffTime}
            </p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 py-10 px-6">
        {/* Sidebar Filter */}
        <aside className="w-full lg:w-1/4 bg-white rounded-2xl shadow-md p-6 border border-sky-100">
          <h2 className="text-lg font-semibold text-sky-700 mb-4">
            🔍 Filter Your Ride
          </h2>

          <div className="space-y-5 text-sm text-gray-700">
            <div>
              <label className="font-semibold text-gray-800 mb-1 block">
                Vehicle Type
              </label>
              <select
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Types</option>
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-800 mb-1 block">
                Brand
              </label>
              <select
                onChange={(e) => handleFilterChange("brand", e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Brands</option>
                <option value="Hero">Hero</option>
                <option value="Yamaha">Yamaha</option>
                <option value="Honda">Honda</option>
                <option value="Royal Enfield">Royal Enfield</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-800 mb-1 block">
                Sort by
              </label>
              <select
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Relevance</option>
                <option value="priceLow">Price: Low → High</option>
                <option value="priceHigh">Price: High → Low</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-full lg:w-3/4">
          <div className="flex justify-between items-center bg-white rounded-xl shadow-sm p-4 border border-sky-100 mb-6">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              Available Vehicles
            </h3>
          </div>

          {filteredVehicles.length === 0 ? (
            <p className="text-center text-gray-500">
              No vehicles available for the selected filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVehicles.map((v) => (
                <div
                  key={v._id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 border border-sky-100"
                >
                  <div className="relative">
                    <img
                      src={
                        v.images?.[0] ||
                        "https://placehold.co/400x200?text=No+Image"
                      }
                      alt={v.modelName}
                      className="w-full h-44 object-contain p-3"
                    />
                    {v.availableCount === 0 && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1 rounded-full">
                        Not Available
                      </span>
                    )}
                  </div>

                  <div className="p-4 border-t border-sky-100">
                    <h3 className="text-lg font-semibold text-[#0F172A]">
                      {v.modelName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {v.brand} • {v.type}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Available:{" "}
                      <span
                        className={`font-bold ${
                          v.availableCount > 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {v.availableCount}
                      </span>{" "}
                      / {v.totalQuantity}
                    </p>

                    <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                      <p className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1 text-sky-600" />
                        {v.location?.city || city}
                      </p>
                      <p className="font-bold text-sky-700">
                        ₹{v.rentPerDay} / day
                      </p>
                    </div>

                    <button
                      disabled={v.availableCount === 0}
                      onClick={() =>
                        navigate(
                          `/booking/${v._id}?city=${city}&pickupDate=${pickupDate}&dropoffDate=${dropoffDate}`,
                          {
                            state: {
                              vehicleName: v.modelName,
                              vehicleImage: v.images?.[0],
                            },
                          }
                        )
                      }
                      className={`w-full mt-4 py-2 font-semibold rounded-md transition ${
                        v.availableCount === 0
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-sky-600 text-white hover:bg-sky-700"
                      }`}
                    >
                      {v.availableCount === 0 ? "Not Available" : "Book Now"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Vehicles;

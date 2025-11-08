import React, { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../assets/logo.jpg";
import VehicleCard from "../components/VehicleCard"; // ✅ new component

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", brand: "", sortBy: "" });

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
      {/* HEADER */}
      <header className="bg-gradient-to-r from-sky-700 to-sky-500 text-white py-5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <img
              src={Logo}
              alt="NewBikeWorld Logo"
              className="w-12 h-12 rounded-full shadow-md"
              loading="lazy"
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

      {/* MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 py-10 px-6">
        {/* SIDEBAR */}
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

        {/* MAIN CONTENT */}
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
                <VehicleCard
                  key={v._id}
                  vehicle={v}
                  city={city}
                  pickupDate={pickupDate}
                  dropoffDate={dropoffDate}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Vehicles;

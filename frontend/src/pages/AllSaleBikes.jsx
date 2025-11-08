import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, X } from "lucide-react";
import Logo from "../assets/logo.jpg";
import AllSaleBikeCard from "../components/AllSaleBikeCard"; // ✅ Lazy-loaded card component

const AllSaleBikes = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBike, setSelectedBike] = useState(null);
  const [imageModalSrc, setImageModalSrc] = useState(null);
  const [filters, setFilters] = useState({ brand: "", year: "", priceRange: "" });
  const [priceRanges, setPriceRanges] = useState([]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/sale-bikes`)
      .then((res) => {
        const allBikes = res.data.bikes || [];
        setBikes(allBikes);
        generateDynamicPriceRanges(allBikes);
      })
      .catch(() => setBikes([]))
      .finally(() => setLoading(false));
  }, []);

  const generateDynamicPriceRanges = (bikes) => {
    const prices = bikes.map((b) => Number(b.price)).filter((p) => !isNaN(p));
    if (prices.length === 0) return;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const step = Math.ceil((max - min) / 4);
    const ranges = [];
    for (let i = 0; i < 4; i++) {
      const start = min + i * step;
      const end = i === 3 ? max : start + step - 1;
      ranges.push({
        label: `₹${start.toLocaleString()} - ₹${end.toLocaleString()}`,
        min: start,
        max: end,
      });
    }
    setPriceRanges(ranges);
  };

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const uniqueBrands = [...new Set(bikes.map((b) => b.brand).filter(Boolean))];
  const uniqueYears = [...new Set(bikes.map((b) => b.year).filter(Boolean))];

  const filteredBikes = bikes.filter((b) => {
    if (filters.brand && b.brand !== filters.brand) return false;
    if (filters.year && String(b.year) !== String(filters.year)) return false;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-").map((x) => Number(x.trim()));
      if (b.price < min || b.price > max) return false;
    }
    return true;
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sky-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2 font-medium">Loading sale bikes...</span>
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
              loading="lazy"
              className="w-12 h-12 rounded-full shadow-md"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                NewBike<span className="text-sky-300">World</span>
              </h1>
              <p className="text-sm text-sky-100 italic">
                Your Journey, Our Bikes 🏍️
              </p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm text-sky-100">
              Explore all bikes available for sale
            </p>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 py-10 px-6">
        {/* SIDEBAR FILTER */}
        <aside className="w-full lg:w-1/4 bg-white rounded-2xl shadow-md p-6 border border-sky-100">
          <h2 className="text-lg font-semibold text-sky-700 mb-4">
            🔍 Filter Bikes
          </h2>
          <div className="space-y-5 text-sm text-gray-700">
            {/* Brand */}
            <div>
              <label className="font-semibold text-gray-800 mb-1 block">
                Brand
              </label>
              <select
                onChange={(e) => handleFilterChange("brand", e.target.value)}
                value={filters.brand}
                className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Brands</option>
                {uniqueBrands.map((brand) => (
                  <option key={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="font-semibold text-gray-800 mb-1 block">
                Year
              </label>
              <select
                onChange={(e) => handleFilterChange("year", e.target.value)}
                value={filters.year}
                className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Years</option>
                {uniqueYears
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year}>{year}</option>
                  ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="font-semibold text-gray-800 mb-1 block">
                Price Range
              </label>
              <select
                onChange={(e) => handleFilterChange("priceRange", e.target.value)}
                value={filters.priceRange}
                className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Prices</option>
                {priceRanges.map((r, i) => (
                  <option key={i} value={`${r.min}-${r.max}`}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="w-full lg:w-3/4">
          <div className="flex justify-between items-center bg-white rounded-xl shadow-sm p-4 border border-sky-100 mb-6">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              Bikes for Sale
            </h3>
            <p className="text-sm text-gray-500">
              {filteredBikes.length} result{filteredBikes.length !== 1 && "s"}
            </p>
          </div>

          {/* Cards */}
          {filteredBikes.length === 0 ? (
            <p className="text-center text-gray-500">
              No bikes match your selected filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBikes.map((b) => (
                <AllSaleBikeCard
                  key={b._id}
                  bike={b}
                  onView={(bike) => setSelectedBike(bike)}
                  onImageClick={(img) => setImageModalSrc(img)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* IMAGE MODAL */}
      {imageModalSrc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModalSrc(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageModalSrc(null);
            }}
            className="absolute top-6 right-6 text-white"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={imageModalSrc}
            alt="Zoomed"
            className="max-h-[90vh] w-auto rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default AllSaleBikes;

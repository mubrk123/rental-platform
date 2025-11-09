import React from "react";
import { MapPin, Gauge } from "lucide-react";
import { useLazyImage } from "../utils/useLazyImage";

const VehicleCard = ({ vehicle, city, pickupDate, dropoffDate, navigate }) => {
  const { visible, ref } = useLazyImage();
  const img =
    vehicle.images?.[0] || "https://placehold.co/400x200?text=No+Image";

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 border border-sky-100">
      <div className="relative">
        {visible ? (
          <img
            ref={ref}
            src={img}
            alt={vehicle.modelName}
            loading="lazy"
            className="w-full h-44 object-contain p-3 transition-opacity duration-700 opacity-100"
          />
        ) : (
          <div
            ref={ref}
            className="w-full h-44 bg-sky-50 animate-pulse rounded-lg p-3"
          />
        )}

        {vehicle.availableCount === 0 && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1 rounded-full">
            Not Available
          </span>
        )}
      </div>

      <div className="p-4 border-t border-sky-100">
        <h3 className="text-lg font-semibold text-[#0F172A]">
          {vehicle.modelName}
        </h3>
        <p className="text-sm text-gray-500">
          {vehicle.brand} • {vehicle.type}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Available:{" "}
          <span
            className={`font-bold ${
              vehicle.availableCount > 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {vehicle.availableCount}
          </span>{" "}
          / {vehicle.totalQuantity}
        </p>

        <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
          <p className="flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-sky-600" />
            {vehicle.location?.city || city}
          </p>
          <p className="font-bold text-sky-700">₹{vehicle.rentPerDay} / day</p>
        </div>

        {/* ✅ NEW: KM Limit per Day */}
        <p className="text-sm text-gray-600 mt-2 flex items-center justify-between">
          <span className="flex items-center">
            <Gauge className="w-4 h-4 mr-1 text-sky-500" />
            {vehicle.kmLimitPerDay
              ? `${vehicle.kmLimitPerDay} km/day limit`
              : "150 km/day limit"}
          </span>
        </p>

        <button
          disabled={vehicle.availableCount === 0}
          onClick={() =>
            navigate(
              `/booking/${vehicle._id}?city=${city}&pickupDate=${pickupDate}&dropoffDate=${dropoffDate}`,
              {
                state: {
                  vehicleName: vehicle.modelName,
                  vehicleImage: vehicle.images?.[0],
                },
              }
            )
          }
          className={`w-full mt-4 py-2 font-semibold rounded-md transition ${
            vehicle.availableCount === 0
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-sky-600 text-white hover:bg-sky-700"
          }`}
        >
          {vehicle.availableCount === 0 ? "Not Available" : "Book Now"}
        </button>
      </div>
    </div>
  );
};

export default VehicleCard;

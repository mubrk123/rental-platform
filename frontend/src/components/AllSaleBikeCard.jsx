import React from "react";
import { Eye } from "lucide-react";
import { useLazyImage } from "../utils/useLazyImage";

const AllSaleBikeCard = ({ bike, onView, onImageClick }) => {
  const { visible, ref } = useLazyImage();
  const img = bike.images?.[0] || "https://placehold.co/400x300?text=No+Image";

  return (
    <div
      key={bike._id}
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 border border-sky-100"
    >
      <div className="relative">
        {visible ? (
          <img
            ref={ref}
            src={img}
            alt={bike.modelName}
            loading="lazy"
            className="w-full h-44 object-contain p-3 transition-opacity duration-700 opacity-100"
            onClick={() => onImageClick(img)}
          />
        ) : (
          <div
            ref={ref}
            className="w-full h-44 bg-sky-50 animate-pulse rounded-lg p-3"
          />
        )}
      </div>

      <div className="p-4 border-t border-sky-100">
        <h3 className="text-lg font-semibold text-[#0F172A]">
          {bike.brand} {bike.modelName}
        </h3>
        <p className="text-sm text-gray-500 mb-1">Year: {bike.year || "—"}</p>
        <p className="text-sky-700 font-bold">₹{bike.price}</p>

        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={() => onView(bike)}
            className="bg-sky-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-sky-700 transition-all text-sm"
          >
            <Eye className="inline w-4 h-4 mr-1" /> View Details
          </button>
          <a
            href="tel:6202673708"
            className="border border-sky-300 text-sky-700 py-2 px-4 rounded-lg font-semibold hover:bg-sky-50 text-sm"
          >
            Contact
          </a>
        </div>
      </div>
    </div>
  );
};

export default AllSaleBikeCard;

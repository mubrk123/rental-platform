import React from "react";
import { Eye } from "lucide-react";
import { useLazyImage } from "../utils/useLazyImage";

const SaleBikeCard = ({ bike, onView, onImageClick }) => {
  const { visible, ref } = useLazyImage();
  const img = bike.images?.[0] || "https://placehold.co/400x300?text=No+Image";

  return (
    <div
      key={bike._id}
      className="relative bg-white rounded-2xl p-6 shadow-md hover:-translate-y-3 hover:shadow-lg transition-transform duration-300"
    >
      {/* ✅ Use `null` src to avoid empty-string warning */}
      {visible ? (
        <img
          ref={ref}
          src={img}
          alt={bike.modelName}
          loading="lazy"
          className="w-full h-48 object-contain bg-sky-50 p-4 rounded-lg mb-4 cursor-pointer transition-opacity duration-700 opacity-100"
          onClick={() => onImageClick(img)}
        />
      ) : (
        <div
          ref={ref}
          className="w-full h-48 bg-sky-50 p-4 rounded-lg mb-4 animate-pulse"
        />
      )}

      <h3 className="text-xl font-semibold text-sky-800">
        {bike.brand} {bike.modelName}
      </h3>
      <p className="text-gray-600 mb-4">₹{bike.price}</p>
      <div className="flex items-center gap-3 justify-center">
        <button
          onClick={() => onView(bike)}
          className="bg-sky-600 text-white py-2 px-5 rounded-lg font-semibold hover:bg-sky-700 hover:scale-105 transition-all"
        >
          <Eye className="inline w-4 h-4 mr-1" />
          View Details
        </button>
        <a
          href="tel:6202673708"
          className="border border-sky-300 text-sky-700 py-2 px-5 rounded-lg font-semibold hover:bg-sky-50"
        >
          Contact
        </a>
      </div>
    </div>
  );
};

export default SaleBikeCard;

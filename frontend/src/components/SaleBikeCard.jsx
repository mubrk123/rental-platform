import React from "react";
import { Eye, Pencil, Trash2, Phone } from "lucide-react";
import { useLazyImage } from "../utils/useLazyImage";
import axios from "axios";

const SaleBikeCard = ({ bike, onView, onEdit, onDelete, isAdmin = false }) => {
  const { visible, ref } = useLazyImage();
  const img = bike.images?.[0] || "https://placehold.co/400x300?text=No+Image";

  const handleDelete = async () => {
    if (!window.confirm("🛑 Are you sure you want to delete this bike?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        alert("❌ Unauthorized: Please log in again as admin.");
        return;
      }

      await axios.delete(`${import.meta.env.VITE_API_URL}/sale-bikes/${bike._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("✅ Bike deleted successfully!");
      onDelete?.(bike._id);
    } catch (err) {
      console.error("Delete failed:", err);
      if (err.response?.status === 401) {
        alert("⚠️ Session expired. Please log in again as admin.");
        localStorage.removeItem("adminToken");
        window.location.href = "/admin-login";
      } else {
        alert("❌ Failed to delete bike. Please try again.");
      }
    }
  };

  return (
    <div
      key={bike._id}
      className="relative bg-white rounded-2xl p-6 shadow-md hover:-translate-y-2 hover:shadow-lg transition-transform duration-300"
    >
      {visible ? (
        <img
          ref={ref}
          src={img}
          alt={bike.modelName}
          loading="lazy"
          className="w-full h-48 object-contain bg-sky-50 p-4 rounded-lg mb-4 cursor-pointer"
          onClick={() => onView(bike)}
        />
      ) : (
        <div ref={ref} className="w-full h-48 bg-sky-50 p-4 rounded-lg mb-4 animate-pulse" />
      )}

      <h3 className="text-lg font-semibold text-sky-800">
        {bike.brand} {bike.modelName}
      </h3>
      <p className="text-gray-600 mb-4">₹{bike.price}</p>

      {/* ✅ Conditional buttons based on role */}
      {isAdmin ? (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => onView(bike)}
            className="bg-sky-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-sky-700 hover:scale-105 transition-all"
          >
            <Eye className="inline w-4 h-4 mr-1" /> View
          </button>
          <button
            onClick={() => onEdit(bike)}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 hover:scale-105 transition-all"
          >
            <Pencil className="inline w-4 h-4 mr-1" /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 hover:scale-105 transition-all"
          >
            <Trash2 className="inline w-4 h-4 mr-1" /> Delete
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => onView(bike)}
            className="bg-sky-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-sky-700 hover:scale-105 transition-all"
          >
            <Eye className="inline w-4 h-4 mr-1" /> View Details
          </button>
          <button
            onClick={() => alert('📞 Contact form coming soon!')}
            className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 hover:scale-105 transition-all"
          >
            <Phone className="inline w-4 h-4 mr-1" /> Contact
          </button>
        </div>
      )}
    </div>
  );
};

export default SaleBikeCard;

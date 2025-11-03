// frontend/src/pages/SaleBikes.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const SaleBikes = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBikes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/sale-bikes`);
      if (res.data?.success) setBikes(res.data.bikes || []);
    } catch (err) {
      console.error("Fetch sale bikes error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBikes();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-sky-600 mr-2" /> Loading bikes...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-sky-800">Bikes for Sale</h1>

      {bikes.length === 0 ? (
        <p className="text-gray-600">No bikes listed for sale yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bikes.map((b) => (
            <div key={b._id} className="bg-white rounded-xl shadow p-4">
              <div className="w-full h-44 bg-gray-100 rounded-md overflow-hidden mb-3">
                <img
                  src={b.images?.[0] || "/placeholder.png"}
                  alt={b.modelName}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-semibold text-lg text-sky-800">{b.brand} {b.modelName}</h3>
              <p className="text-sm text-gray-600 mb-2">{b.city} • {b.year || "—"}</p>
              <p className="text-gray-700 font-bold mb-3">₹{b.price?.toLocaleString?.() || b.price}</p>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{b.description}</p>
              <div className="flex justify-between items-center">
                <Link to={`/sale-bikes/${b._id}`} className="text-sm text-sky-600 font-semibold">View details</Link>
                <button className="bg-sky-600 text-white px-3 py-1 rounded">Contact</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SaleBikes;

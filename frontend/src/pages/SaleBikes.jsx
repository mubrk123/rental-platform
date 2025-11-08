import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import SaleBikeCard from "../components/SaleBikeCard"; // ✅ Reusable component

const SaleBikes = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            <SaleBikeCard
              key={b._id}
              bike={b}
              onView={() => (window.location.href = `/sale-bikes/${b._id}`)}
              onImageClick={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SaleBikes;

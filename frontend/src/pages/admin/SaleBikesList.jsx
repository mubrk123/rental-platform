import React, { useEffect, useState } from "react";
import axios from "axios";
import { Eye, X, Loader2, Pencil, Save, Trash2 } from "lucide-react";
import SaleBikeCard from "../../components/SaleBikeCard"; // ✅ Import the card component

const SaleBikesList = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBike, setSelectedBike] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  // ✅ Fetch all bikes on mount
  useEffect(() => {
    const fetchBikes = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/sale-bikes`);
        setBikes(res.data.bikes || []);
      } catch (err) {
        console.error("Error fetching sale bikes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBikes();
  }, []);

  // ✅ Start edit mode
  const handleEditClick = (bike) => {
    setEditMode(true);
    setFormData({
      modelName: bike.modelName,
      brand: bike.brand,
      year: bike.year || "",
      price: bike.price,
      description: bike.description || "",
    });
    setExistingImages(bike.images || []);
    setNewImages([]);
  };

  // ✅ Handle input change
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ✅ Handle new image upload
  const handleNewImageChange = (e) => {
    setNewImages(Array.from(e.target.files));
  };

  // ✅ Delete one image from the list
  const handleDeleteExistingImage = (index) => {
    const updated = existingImages.filter((_, i) => i !== index);
    setExistingImages(updated);
  };

  // ✅ Save updated details
  const handleUpdate = async (e) => {
  e.preventDefault();
  if (!selectedBike) return;

  const data = new FormData();
  Object.entries(formData).forEach(([key, val]) => data.append(key, val));
  data.append("existingImages", JSON.stringify(existingImages));
  newImages.forEach((file) => data.append("newImages", file));

  try {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      alert("❌ Unauthorized: Please log in again as admin.");
      return;
    }

    await axios.put(
      `${import.meta.env.VITE_API_URL}/sale-bikes/${selectedBike._id}`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    alert("✅ Bike updated successfully!");
    setEditMode(false);
    setSelectedBike(null);

    // Refresh state with updated bike
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/sale-bikes/${selectedBike._id}`
    );
    setBikes((prev) =>
      prev.map((b) => (b._id === selectedBike._id ? res.data.bike : b))
    );
  } catch (err) {
    console.error("Update failed:", err);
    alert(
      err.response?.data?.message ||
        "❌ Failed to update bike details. Check console for details."
    );
  }
};


  // ✅ Resolve image URLs
  const resolveImageUrl = (path) => {
    if (!path) return "https://placehold.co/400x300?text=No+Image";
    return path.startsWith("http")
      ? path
      : `${import.meta.env.VITE_API_URL.replace("/api", "")}${path}`;
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-blue-700">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading sale bikes...
      </div>
    );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Bikes for Sale</h2>

      {bikes.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No bikes uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bikes.map((bike) => (
            <SaleBikeCard
              key={bike._id}
              bike={bike}
              isAdmin={true}
              onView={(bike) => setSelectedBike(bike)}
              onEdit={(bike) => {
                setSelectedBike(bike);
                handleEditClick(bike);
              }}
              onDelete={(id) => setBikes((prev) => prev.filter((b) => b._id !== id))} // ✅ Instant delete
            />
          ))}
        </div>
      )}

      {/* Modal for View/Edit */}
      {selectedBike && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-lg relative p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => {
                setSelectedBike(null);
                setEditMode(false);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            {!editMode ? (
              <>
                <h2 className="text-2xl font-bold mb-3 text-blue-700">
                  {selectedBike.modelName}
                </h2>
                <div className="space-y-2 text-sm">
                  <p><strong>Brand:</strong> {selectedBike.brand}</p>
                  <p><strong>Year:</strong> {selectedBike.year || "—"}</p>
                  <p><strong>Price:</strong> ₹{selectedBike.price}</p>
                  <p><strong>Description:</strong> {selectedBike.description || "No description available"}</p>
                </div>

                {selectedBike.images?.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {selectedBike.images.map((img, i) => (
                      <img
                        key={i}
                        src={resolveImageUrl(img)}
                        alt={`bike-${i}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <h2 className="text-2xl font-bold mb-2 text-blue-700">
                  Edit Bike Details
                </h2>

                <input
                  type="text"
                  name="modelName"
                  value={formData.modelName}
                  onChange={handleInputChange}
                  placeholder="Model Name"
                  className="border rounded-lg p-2 w-full"
                  required
                />
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Brand"
                  className="border rounded-lg p-2 w-full"
                  required
                />
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="Year"
                  className="border rounded-lg p-2 w-full"
                />
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Price (₹)"
                  className="border rounded-lg p-2 w-full"
                  required
                />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Short Description"
                  className="border rounded-lg p-2 w-full"
                />

                {existingImages.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-gray-700 mb-2">Existing Images:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {existingImages.map((img, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={resolveImageUrl(img)}
                            alt={`bike-${i}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingImage(i)}
                            className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-80 hover:opacity-100 transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleNewImageChange}
                  className="border rounded-lg p-2 w-full mt-2"
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleBikesList;

import React, { useState } from "react";
import axios from "axios";
import { UploadCloud, Image as ImageIcon, Gauge } from "lucide-react";

const LOCATIONS = [
  "All Locations",
  "Lalbagh",
  "NagaVara",
  "Residency Road",
  "Gandhi Nagar",
];

const UploadVehicle = () => {
  const [formData, setFormData] = useState({
    modelName: "",
    brand: "",
    rentPerDay: "",
    totalQuantity: "",
    city: LOCATIONS[0],
    type: "bike",
    kmLimitPerDay: "", // ✅ Added new field
  });
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage("");

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => data.append(k, v));
      images.forEach((img) => data.append("images", img));

      const token = localStorage.getItem("adminToken");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/vehicles`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("✅ Vehicle uploaded successfully!");
      setFormData({
        modelName: "",
        brand: "",
        rentPerDay: "",
        totalQuantity: "",
        city: LOCATIONS[0],
        type: "bike",
        kmLimitPerDay: "", // ✅ Reset field
      });
      setImages([]);
      setPreview([]);
      console.log(res.data);
    } catch (err) {
      console.error("Upload failed:", err);
      setMessage("❌ Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <UploadCloud className="w-6 h-6 mr-2 text-purple-600" /> Upload New Vehicle
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            name="modelName"
            placeholder="Model Name"
            value={formData.modelName}
            onChange={handleChange}
            className="border rounded-lg p-2"
            required
          />
          <input
            name="brand"
            placeholder="Brand"
            value={formData.brand}
            onChange={handleChange}
            className="border rounded-lg p-2"
            required
          />
          <input
            type="number"
            name="rentPerDay"
            placeholder="Rent Per Day (₹)"
            value={formData.rentPerDay}
            onChange={handleChange}
            className="border rounded-lg p-2"
            required
          />
          <input
            type="number"
            name="totalQuantity"
            placeholder="Total Quantity"
            value={formData.totalQuantity}
            onChange={handleChange}
            className="border rounded-lg p-2"
            required
          />

          {/* ✅ New KM Limit Field */}
          <input
            type="number"
            name="kmLimitPerDay"
            placeholder="KM Limit Per Day (e.g. 150)"
            value={formData.kmLimitPerDay}
            onChange={handleChange}
            className="border rounded-lg p-2"
            required
          />

          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="border rounded-lg p-2"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc}>{loc}</option>
            ))}
          </select>

          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="border rounded-lg p-2"
          >
            <option value="bike">bike</option>
            <option value="scooter">scooter</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-1 font-medium flex items-center">
            <ImageIcon className="w-4 h-4 mr-2 text-purple-500" /> Upload Images
          </label>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} />
        </div>

        {preview.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {preview.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`preview-${idx}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Vehicle"}
        </button>

        {message && (
          <div className="mt-4 p-2 text-center rounded bg-gray-50 text-sm font-medium">
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadVehicle;

// frontend/src/pages/admin/UploadSaleBike.jsx
import React, { useState } from "react";
import axios from "axios";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

const UploadSaleBike = () => {
  const [form, setForm] = useState({
    modelName: "",
    brand: "",
    price: "",
    description: "",
    year: "",
    mileage: "",
    condition: "Used",
    city: "Koramangala, Bangalore",
  });
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    setImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (images.length < 3) {
      setMessage("Please upload at least 3 images.");
      return;
    }
    setSubmitting(true);

    try {
      const data = new FormData();
      Object.keys(form).forEach((k) => data.append(k, form[k]));
      images.forEach((img) => data.append("images", img));

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/sale-bikes`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET,
        },
      });

      if (res.data?.success) {
        setMessage("✅ Bike listed for sale successfully!");
        setForm({
          modelName: "",
          brand: "",
          price: "",
          description: "",
          year: "",
          mileage: "",
          condition: "Used",
          city: "Koramangala, Bangalore",
        });
        setImages([]);
        setPreview([]);
      } else {
        setMessage("❌ Failed to create listing.");
      }
    } catch (err) {
      console.error("Upload sale bike error:", err);
      setMessage("❌ Error uploading. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <UploadCloud className="w-6 h-6 mr-2 text-sky-600" /> Upload Bike For Sale
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="modelName" value={form.modelName} onChange={handleChange} required placeholder="Model name" className="border rounded p-2" />
          <input name="brand" value={form.brand} onChange={handleChange} required placeholder="Brand" className="border rounded p-2" />
          <input name="price" type="number" value={form.price} onChange={handleChange} required placeholder="Price (₹)" className="border rounded p-2" />
          <input name="year" type="number" value={form.year} onChange={handleChange} placeholder="Year" className="border rounded p-2" />
          <input name="mileage" value={form.mileage} onChange={handleChange} placeholder="Mileage (e.g., 15,000 km)" className="border rounded p-2" />
          <select name="condition" value={form.condition} onChange={handleChange} className="border rounded p-2">
            <option>Used</option>
            <option>Excellent</option>
            <option>Good</option>
            <option>Brand New</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full border rounded p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center">
            <ImageIcon className="w-4 h-4 mr-2 text-sky-600" /> Upload Images (min 3)
          </label>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
        </div>

        {preview.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {preview.map((p, i) => (
              <img key={i} src={p} alt={`preview-${i}`} className="w-full h-28 object-cover rounded-md border" />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700">
            {submitting ? "Uploading..." : "Create Listing"}
          </button>
          <div className="text-sm text-gray-600">{message}</div>
        </div>
      </form>
    </div>
  );
};

export default UploadSaleBike;

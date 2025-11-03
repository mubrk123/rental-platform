import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  FileImage,
  FileText,
  Download,
  UploadCloud,
} from "lucide-react";

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [statusMap, setStatusMap] = useState({}); // Track per booking step progress

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/bookings`, {
        headers: { "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET },
      });
      const active = (res.data || []).filter(
        (b) => b.status?.toLowerCase() !== "completed"
      );
      setBookings(active);
      // Initialize local step states for each booking
      const initialStatus = {};
      active.forEach(
        (b) =>
          (initialStatus[b._id] = {
            photoUploaded: false,
            pdfDownloaded: false,
          })
      );
      setStatusMap(initialStatus);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUploadPickupPhoto = async (bookingId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("pickupPhoto", file);
      setUploading(bookingId);

      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/bookings/${bookingId}/upload-pickup-photo`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET,
            },
          }
        );
        alert("✅ Pickup photo uploaded successfully!");
        setStatusMap((prev) => ({
          ...prev,
          [bookingId]: { ...prev[bookingId], photoUploaded: true },
        }));
      } catch (err) {
        console.error("Upload error:", err);
        alert("❌ Failed to upload photo.");
      } finally {
        setUploading(null);
      }
    };
  };

  const handleDownloadPDF = (bookingId) => {
    const url = `${import.meta.env.VITE_API_URL}/bookings/pdf/booking/${bookingId}?admin_secret=${import.meta.env.VITE_ADMIN_SECRET}`;
    window.open(url, "_blank");
    setStatusMap((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], pdfDownloaded: true },
    }));
  };

  const handleComplete = async (id) => {
    if (!window.confirm("Confirm to mark returned and delete booking?")) return;
    setUpdating(id);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/bookings/complete/${id}`
      );
      if (res.data?.success) {
        setBookings((prev) => prev.filter((b) => b._id !== id));
        alert("✅ Booking marked as returned.");
      }
    } catch (err) {
      console.error("Error completing booking:", err);
      alert("❌ Server error.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-blue-700">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading bookings...
      </div>
    );

  return (
    <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center text-[#1E3A8A]">
        <ClipboardList className="w-6 h-6 mr-2 text-blue-700" /> Active Bookings
      </h2>

      <table className="min-w-full border-collapse">
        <thead className="bg-[#F8FAFC] text-gray-700 uppercase text-xs font-semibold">
          <tr>
            <th className="p-3 border-b text-left">User</th>
            <th className="p-3 border-b text-left">Dates</th>
            <th className="p-3 border-b text-center">Documents</th>
            <th className="p-3 border-b text-center">Status</th>
            <th className="p-3 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const step = statusMap[b._id] || {};
            const photoDone = step.photoUploaded;
            const pdfDone = step.pdfDownloaded;

            return (
              <tr key={b._id} className="hover:bg-sky-50 border-b">
                <td className="p-3">
                  <div className="font-semibold text-gray-800">{b.name}</div>
                  <div className="text-sm text-gray-500">{b.phoneNumber}</div>
                  <div className="text-xs text-gray-400">{b.email}</div>
                </td>

                <td className="p-3 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold text-blue-700">Pickup:</span>{" "}
                    {b.pickupDate?.slice(0, 10)}
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Dropoff:</span>{" "}
                    {b.dropoffDate?.slice(0, 10)}
                  </div>
                </td>

                <td className="p-3 text-center space-y-1">
                  {b.aadhaarDocument ? (
                    <a
                      href={b.aadhaarDocument}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      <FileImage className="inline w-4 h-4 mr-1" /> Aadhaar
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No Aadhaar</span>
                  )}
                  {b.licenseDocument ? (
                    <a
                      href={b.licenseDocument}
                      target="_blank"
                      className="block text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      <FileText className="inline w-4 h-4 mr-1" /> License
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No License</span>
                  )}
                </td>

                <td className="p-3 text-center">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">
                    Active
                  </span>
                </td>

                <td className="p-3 text-center space-y-2">
                  {/* Upload pickup image */}
                  <button
                    onClick={() => handleUploadPickupPhoto(b._id)}
                    disabled={uploading === b._id || photoDone}
                    className={`${
                      photoDone
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    } text-white px-3 py-1 rounded-md flex items-center justify-center w-full`}
                  >
                    {uploading === b._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : photoDone ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Uploaded
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 mr-1" /> Upload Pickup
                      </>
                    )}
                  </button>

                  {/* Download PDF */}
                  <button
                    onClick={() => handleDownloadPDF(b._id)}
                    disabled={!photoDone}
                    className={`${
                      photoDone
                        ? "bg-blue-700 hover:bg-blue-800"
                        : "bg-gray-400 cursor-not-allowed"
                    } text-white px-3 py-1 rounded-md flex items-center justify-center w-full`}
                  >
                    <Download className="w-4 h-4 mr-1" /> Download PDF
                  </button>

                  {/* Mark Returned */}
                  <button
                    onClick={() => handleComplete(b._id)}
                    disabled={!photoDone || !pdfDone || updating === b._id}
                    className={`bg-green-600 text-white px-3 py-1 rounded-md flex items-center justify-center w-full ${
                      !photoDone || !pdfDone
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:bg-green-700"
                    }`}
                  >
                    {updating === b._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Returned
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BookingsList;

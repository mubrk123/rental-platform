import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import toast, { Toaster } from "react-hot-toast";

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMap, setStatusMap] = useState({});

  // ✅ Memoized headers
  const adminHeaders = useMemo(
    () => ({
      "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET,
    }),
    []
  );

  // ✅ Fetch all bookings
  const fetchBookings = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/bookings`, {
        headers: adminHeaders,
      });

      const active = (res.data || []).filter(
        (b) => b.status?.toLowerCase() !== "completed"
      );
      setBookings(active);

      // Initialize upload/download status
      const initialStatus = {};
      active.forEach((b) => {
        initialStatus[b._id] = {
          photoUploaded: !!b.pickupPhoto,
          pdfDownloaded: !!b.pdfDownloaded,
        };
      });
      setStatusMap(initialStatus);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      toast.error("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ✅ Upload pickup photo
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
      setUploadingId(bookingId);

      const uploadPromise = axios
        .post(
          `${import.meta.env.VITE_API_URL}/bookings/${bookingId}/upload-pickup-photo`,
          formData,
          {
            headers: {
              ...adminHeaders,
              "Content-Type": "multipart/form-data",
            },
          }
        )
        .then((res) => {
          if (res.data?.success) {
            setStatusMap((prev) => ({
              ...prev,
              [bookingId]: { ...prev[bookingId], photoUploaded: true },
            }));
            toast.success("Pickup photo uploaded successfully!");
          } else {
            throw new Error("Upload failed");
          }
        })
        .catch(() => toast.error("Failed to upload pickup photo."))
        .finally(() => {
          setUploadingId(null);
        });

      await toast.promise(uploadPromise, {
        loading: "Uploading photo...",
        success: "Photo uploaded!",
        error: "Upload failed.",
      });

      fetchBookings();
    };
  };

  // ✅ Download PDF
  const handleDownloadPDF = async (bookingId) => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/bookings/pdf/booking/${bookingId}?admin_secret=${import.meta.env.VITE_ADMIN_SECRET}`;
      window.open(url, "_blank");

      await axios.put(
        `${import.meta.env.VITE_API_URL}/bookings/${bookingId}/mark-pdf-downloaded`,
        {},
        { headers: adminHeaders }
      );

      setStatusMap((prev) => ({
        ...prev,
        [bookingId]: { ...prev[bookingId], pdfDownloaded: true },
      }));
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to download PDF.");
    }
  };

  // ✅ Mark as completed
  const handleComplete = async (id) => {
    if (!window.confirm("Mark this booking as returned and remove it?")) return;
    setUpdatingId(id);

    const completePromise = axios
      .put(`${import.meta.env.VITE_API_URL}/bookings/complete/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setBookings((prev) => prev.filter((b) => b._id !== id));
          toast.success("Booking marked as returned.");
        } else {
          throw new Error("Failed");
        }
      })
      .catch(() => toast.error("Failed to complete booking."))
      .finally(() => setUpdatingId(null));

    await toast.promise(completePromise, {
      loading: "Updating...",
      success: "Booking completed!",
      error: "Failed to update booking.",
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-blue-700">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading bookings...
      </div>
    );

  return (
    <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 relative">
      <Toaster position="top-center" reverseOrder={false} />

      <h2 className="text-2xl font-bold mb-4 flex items-center text-[#1E3A8A]">
        <ClipboardList className="w-6 h-6 mr-2 text-blue-700" /> Active Bookings
      </h2>

      <div className="overflow-x-auto">
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
                      <span className="font-semibold text-blue-700">
                        Pickup:
                      </span>{" "}
                      {b.pickupDate?.slice(0, 10)}
                    </div>
                    <div>
                      <span className="font-semibold text-blue-700">
                        Dropoff:
                      </span>{" "}
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
                      disabled={uploadingId === b._id}
                      className={`${
                        photoDone
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      } text-white px-3 py-1 rounded-md flex items-center justify-center w-full`}
                    >
                      {uploadingId === b._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : photoDone ? (
                        <>
                          <UploadCloud className="w-4 h-4 mr-1" /> Upload Again
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
                      <Download className="w-4 h-4 mr-1" />
                      {pdfDone ? "Download Again" : "Download PDF"}
                    </button>

                    {/* Mark Returned */}
                    <button
                      onClick={() => handleComplete(b._id)}
                      disabled={!photoDone || !pdfDone || updatingId === b._id}
                      className={`bg-green-600 text-white px-3 py-1 rounded-md flex items-center justify-center w-full ${
                        !photoDone || !pdfDone
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-green-700"
                      }`}
                    >
                      {updatingId === b._id ? (
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
    </div>
  );
};

export default BookingsList;

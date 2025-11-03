import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Calendar,
  Clock,
  Bike,
  TrendingUp,
  Loader2,
  User,
  MoreVertical,
  Search,
  X,
} from "lucide-react";

const StatusBadge = ({ status }) => {
  const colorMap = {
    booked: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full ${
        colorMap[status?.toLowerCase()] || "bg-gray-200 text-gray-700"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
};

const SummaryCard = ({ icon: Icon, title, value }) => (
  <div className="bg-white/80 backdrop-blur-lg border border-blue-100 shadow-md rounded-xl p-5 flex flex-col justify-between hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
    <div className="flex items-center justify-between">
      <div className="bg-gradient-to-r from-[#0E3A61] to-[#1E88E5] p-3 rounded-full text-white shadow-md">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-3xl font-bold text-[#0E3A61]">{value}</h3>
    </div>
    <p className="text-gray-600 font-medium mt-2 text-sm">{title}</p>
  </div>
);

const DashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stats`, {
         headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        });
        setStats(res.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#1E88E5] animate-spin" />
      </div>
    );

  const recentBookings = stats?.recentBookings || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/80 border border-blue-100 rounded-xl p-5 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold text-[#0E3A61]">
            Welcome back, Admin 👋
          </h2>
          <p className="text-sm text-gray-600">
            Here’s your latest activity and insights.
          </p>
        </div>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-[#1E88E5] outline-none"
          />
        </div>
      </div>

     {/* Summary cards */}
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <SummaryCard
    icon={Calendar}
    title="Today's Pickups"
    value={stats?.todaysPickups ?? 0}
    colorFrom="from-purple-500"
    colorTo="to-purple-700"
  />
  <SummaryCard
    icon={Clock}
    title="Pending Bookings"
    value={stats?.pendingBookings ?? 0}
    colorFrom="from-purple-600"
    colorTo="to-fuchsia-600"
  />
  <SummaryCard
    icon={Bike}
    title="Active Vehicles"
    value={stats?.activeVehicles ?? 0}
    colorFrom="from-fuchsia-600"
    colorTo="to-purple-600"
  />
  <SummaryCard
    icon={TrendingUp}
    title="Total Revenue (Month)"
    value={`₹${stats?.totalRevenue ?? 0}`}
    colorFrom="from-purple-800"
    colorTo="to-fuchsia-600"
  />
</div>


      {/* Recent Bookings */}
<div className="bg-white shadow-md rounded-2xl p-6 border border-purple-100">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-bold text-purple-800">Recent Bookings</h2>
    <span className="text-sm text-gray-500">
      Showing last {recentBookings.length} bookings
    </span>
  </div>

  {/* ✅ Mobile card layout */}
  <div className="block sm:hidden space-y-4">
    {recentBookings.length === 0 ? (
      <p className="text-center text-gray-400">No bookings found.</p>
    ) : (
      recentBookings.map((b) => (
        <div
          key={b._id}
          className="border border-purple-100 rounded-lg p-4 shadow-sm bg-purple-50/30"
        >
          <p className="font-semibold text-gray-800">{b.name}</p>
          <p className="text-sm text-gray-500">
            {b.vehicleId?.modelName || "—"} • {b.city || "—"}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {new Date(b.pickupDate).toLocaleDateString()} →{" "}
            {new Date(b.dropoffDate).toLocaleDateString()}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <StatusBadge status={b.status} />
            <button
              onClick={() => setSelected(b)}
              className="text-purple-600 text-sm font-medium"
            >
              View
            </button>
          </div>
        </div>
      ))
    )}
  </div>

  {/* ✅ Desktop table layout */}
  <div className="hidden sm:block overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gradient-to-r from-purple-50 to-fuchsia-50 text-gray-700 uppercase text-xs font-semibold">
        <tr>
          <th className="text-left p-3">Customer</th>
          <th className="text-left p-3">Vehicle</th>
          <th className="text-left p-3">Dates</th>
          <th className="text-left p-3">City</th>
          <th className="text-left p-3">Status</th>
          <th className="text-right p-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {recentBookings.map((b) => (
          <tr
            key={b._id}
            className="border-b hover:bg-purple-50 transition-all"
          >
            <td className="p-3">{b.name}</td>
            <td className="p-3">{b.vehicleId?.modelName || "—"}</td>
            <td className="p-3">
              {new Date(b.pickupDate).toLocaleDateString()} →{" "}
              {new Date(b.dropoffDate).toLocaleDateString()}
            </td>
            <td className="p-3">{b.city || "—"}</td>
            <td className="p-3">
              <StatusBadge status={b.status} />
            </td>
            <td className="p-3 text-right">
              <button
                onClick={() => setSelected(b)}
                className="text-purple-600 hover:text-purple-800 font-semibold"
              >
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

    </div>
  );
};

export default DashboardHome;

import React, { useState, useMemo, memo } from "react";
import axios from "axios";
import {
  Calendar,
  Clock,
  Bike,
  TrendingUp,
  Loader2,
  Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// ✅ React Query setup (ensure it’s initialized once in your App.jsx)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

const DashboardHome = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardHomeContent />
    </QueryClientProvider>
  );
};

const DashboardHomeContent = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Fetch dashboard stats — cached & refetched only when stale
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      return res.data;
    },
    staleTime: 2 * 60 * 1000, // 2 mins cache
    retry: 1, // Retry once on failure
  });

  const filteredBookings = useMemo(() => {
    if (!stats?.recentBookings) return [];
    return stats.recentBookings.filter((b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stats, searchTerm]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-[60vh] text-[#1E88E5]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  if (isError)
    return (
      <div className="text-center text-red-600 font-medium mt-10">
        ❌ Failed to load dashboard data. Try refreshing.
      </div>
    );

  const SummaryCard = ({ icon: Icon, title, value }) => (
    <div className="bg-white/80 backdrop-blur-lg border border-blue-100 shadow-md rounded-xl p-5 flex flex-col justify-between hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="bg-gradient-to-r from-[#0E3A61] to-[#1E88E5] p-3 rounded-full text-white shadow-md">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-3xl font-bold text-[#0E3A61]">
          {value ?? 0}
        </h3>
      </div>
      <p className="text-gray-600 font-medium mt-2 text-sm">{title}</p>
    </div>
  );

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
            placeholder="Search bookings..."
            className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-[#1E88E5] outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Calendar}
          title="Today's Pickups"
          value={stats?.todaysPickups}
        />
        <SummaryCard
          icon={Clock}
          title="Pending Bookings"
          value={stats?.pendingBookings}
        />
        <SummaryCard
          icon={Bike}
          title="Active Vehicles"
          value={stats?.activeVehicles}
        />
        <SummaryCard
          icon={TrendingUp}
          title="Total Revenue (Month)"
          value={`₹${stats?.totalRevenue ?? 0}`}
        />
      </div>

      {/* Recent Bookings */}
      <RecentBookings bookings={filteredBookings} />
    </div>
  );
};

// ✅ Recent Bookings section — memoized for large data
const RecentBookings = memo(({ bookings }) => {
  if (!bookings?.length)
    return (
      <div className="text-center text-gray-500 bg-white p-6 rounded-lg border border-gray-100">
        No recent bookings found.
      </div>
    );

  return (
    <div className="bg-white shadow-md rounded-2xl p-6 border border-blue-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#0E3A61]">Recent Bookings</h2>
        <span className="text-sm text-gray-500">
          Showing last {bookings.length} bookings
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-50 to-blue-100 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Vehicle</th>
              <th className="text-left p-3">Dates</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} className="border-b hover:bg-blue-50 transition">
                <td className="p-3 font-medium text-gray-800">{b.name}</td>
                <td className="p-3 text-gray-700">
                  {b.vehicleId?.modelName || "—"}
                </td>
                <td className="p-3 text-gray-700">
                  {new Date(b.pickupDate).toLocaleDateString()} →{" "}
                  {new Date(b.dropoffDate).toLocaleDateString()}
                </td>
                <td className="p-3 text-gray-700">{b.city || "—"}</td>
                <td className="p-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

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

export default DashboardHome;

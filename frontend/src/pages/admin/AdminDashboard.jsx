import React, { useState, useEffect } from "react";
import {
  Home,
  Calendar,
  Bike,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  UserCircle,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import DashboardHome from "./DashboardHome";
import BookingsList from "./BookingsList";
import UploadedVehicles from "./UploadedVehicles";
import UploadVehicle from "./UploadVehicle";
import UploadSaleBike from "./UploadSaleBike";
import SaleBikesList from "./SaleBikesList";
import SettingsPage from "./Settings";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "auto";
  }, [sidebarOpen]);

  const handleLogout = () => {
    window.location.href = "/";
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardHome />;
      case "bookings":
        return <BookingsList />;
      case "vehicles":
        return <UploadedVehicles />;
      case "upload":
        return <UploadVehicle />;
      case "upload-sale":
        return <UploadSaleBike />;
      case "sale-list":
        return <SaleBikesList />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F8FB] text-[#0E3A61] font-[Inter]">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-64"
        } hidden md:flex flex-col bg-gradient-to-b from-[#0E3A61]/95 to-[#1E88E5]/95 backdrop-blur-lg shadow-2xl transition-all duration-300 border-r border-blue-100`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-blue-200">
          {!collapsed ? (
            <h2 className="text-xl font-bold text-white tracking-wide">
              Admin Panel
            </h2>
          ) : (
            <h2 className="text-lg font-bold text-white">A</h2>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-white/10 transition"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-white/80" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-white/80" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col p-4 space-y-1 text-sm font-medium">
          {[
            ["Dashboard", Home, "dashboard"],
            ["Bookings", Calendar, "bookings"],
            ["My Vehicles", Bike, "vehicles"],
            ["Upload Vehicle", Upload, "upload"],
            ["Upload Sale Bike", Upload, "upload-sale"],
            ["Sale Bike List", List, "sale-list"],
            ["Settings", Settings, "settings"],
          ].map(([label, Icon, key]) => (
            <SidebarButton
              key={key}
              icon={Icon}
              label={label}
              active={activeTab === key}
              collapsed={collapsed}
              onClick={() => setActiveTab(key)}
            />
          ))}
        </nav>

        {/* Logout */}
        <div className="mt-auto border-t border-blue-200 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full bg-gradient-to-r from-[#0E3A61] to-[#1E88E5] text-white py-2 rounded-lg hover:opacity-90 transition"
          >
            <LogOut className="w-4 h-4 mr-2" /> {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* ===== MOBILE SIDEBAR ===== */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-gradient-to-r from-[#0E3A61]/95 to-[#1E88E5]/95 backdrop-blur-md border-b border-blue-200 z-30 flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white hover:text-gray-200 p-2 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative bg-gradient-to-b from-[#0E3A61] to-[#1E88E5] w-64 p-5 shadow-xl z-50 flex flex-col border-r border-blue-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col space-y-2">
              {[
                ["Dashboard", Home, "dashboard"],
                ["Bookings", Calendar, "bookings"],
                ["My Vehicles", Bike, "vehicles"],
                ["Upload Vehicle", Upload, "upload"],
                ["Upload Sale Bike", Upload, "upload-sale"],
                ["Sale Bike List", List, "sale-list"],
                ["Settings", Settings, "settings"],
              ].map(([label, Icon, key]) => (
                <SidebarButton
                  key={key}
                  icon={Icon}
                  label={label}
                  active={activeTab === key}
                  onClick={() => {
                    setActiveTab(key);
                    setSidebarOpen(false);
                  }}
                />
              ))}
            </nav>

            <div className="mt-auto border-t border-blue-200 pt-4">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full bg-gradient-to-r from-[#0E3A61] to-[#1E88E5] text-white py-2 rounded-lg hover:opacity-90 transition"
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="hidden md:flex items-center justify-between bg-gradient-to-r from-[#0E3A61]/95 to-[#1E88E5]/95 backdrop-blur-md text-white px-8 py-4 sticky top-0 z-20 shadow-lg">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-200" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-3 py-2 text-sm rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:ring-2 focus:ring-white/40 outline-none"
              />
            </div>
            <button className="p-2 hover:bg-white/10 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
            </button>
            <button className="flex items-center">
              <UserCircle className="w-8 h-8 text-white" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <section className="flex-1 p-4 sm:p-6 md:p-8 bg-[#F5F8FB] mt-12 md:mt-0 overflow-y-auto">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

const SidebarButton = ({ icon: Icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center ${
      collapsed ? "justify-center" : "justify-start"
    } gap-3 px-4 py-2 rounded-lg font-medium transition-all ${
      active
        ? "bg-white/20 text-white shadow-sm"
        : "text-gray-100 hover:bg-white/10"
    }`}
  >
    <Icon className="w-5 h-5" />
    {!collapsed && <span>{label}</span>}
  </button>
);

export default AdminDashboard;

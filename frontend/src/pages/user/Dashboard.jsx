import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Eye, X, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeroImg from "../../assets/HeroImg4.png";
import Logo from "../../assets/logo2.png";
import axios from "axios";
import SaleBikeCard from "../../components/SaleBikeCard"; // ✅ new import

/* -------------------------------------------------------------------------- */
/* 📍 Constants                                                               */
/* -------------------------------------------------------------------------- */
const LOCATIONS = [
  "All Locations",
  "Lalbagh",
  "NagaVara",
  "Residency Road",
  "Gandhi Nagar",
];

/* -------------------------------------------------------------------------- */
/* 🧭 Navbar Component                                                        */
/* -------------------------------------------------------------------------- */
const Navbar = ({ onSaleClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "h-16 bg-white/85 backdrop-blur-lg shadow-md"
          : "h-20 bg-white/70 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 h-full">
        <div className="flex items-center">
          <img
            src={Logo}
            alt="Logo"
            className="w-14 h-14 mr-3 rounded-full shadow-md"
          />
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="text-[#0F172A]">NewBike</span>
            <span className="text-sky-600">World</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <button
            onClick={onSaleClick}
            className="ml-4 bg-gradient-to-r from-[#0F172A] to-sky-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md animate-pulse hover:from-[#1E293B] hover:to-sky-500 transition"
          >
            Bike for Sale
          </button>
          <a
            href="tel:6202673708"
            className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:bg-sky-700 transition"
          >
            <Phone className="w-4 h-4" />
            Contact Us
          </a>
        </nav>

        <button
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 md:hidden animate-slideDown">
            <button
              onClick={() => {
                onSaleClick();
                setIsMenuOpen(false);
              }}
              className="mt-3 w-full bg-gradient-to-r from-[#0F172A] to-sky-600 text-white py-2 rounded-lg font-semibold hover:from-[#1E293B] hover:to-sky-500 transition"
            >
              Bike for Sale
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

/* -------------------------------------------------------------------------- */
/* 🔍 Search Widget                                                           */
/* -------------------------------------------------------------------------- */
const SearchWidget = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [pickupDate, setPickupDate] = useState(today);
  const [dropoffDate, setDropoffDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [error, setError] = useState("");

  /* ---------------------------------------------------------------------- */
  /* 🕓 Time Restrictions (24-hr format)                                   */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Default earliest pickup time
    let minPickup = "08:00";

    // If booking today → 1 hour from now
    if (pickupDate === todayStr) {
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const hrs = nextHour.getHours().toString().padStart(2, "0");
      const mins = nextHour.getMinutes().toString().padStart(2, "0");
      minPickup = `${hrs}:${mins}`;
    }

    if (pickupTime && pickupTime < minPickup) setPickupTime(minPickup);
    if (dropoffTime && dropoffTime > "23:30") setDropoffTime("23:30");
  }, [pickupDate, pickupTime, dropoffTime]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Validation + Navigation                                             */
  /* ---------------------------------------------------------------------- */
  const validate = () => {
    if (!pickupLocation) return "Please select a pickup location.";
    if (!pickupDate || !pickupTime) return "Please select pickup date & time.";
    if (!dropoffDate || !dropoffTime)
      return "Please select drop-off date & time.";

    const pickup = new Date(`${pickupDate}T${pickupTime}`);
    const dropoff = new Date(`${dropoffDate}T${dropoffTime}`);
    const now = new Date();

    if (pickup < now) return "Pickup time cannot be in the past.";
    if (dropoff <= pickup) return "Drop-off must be after pickup.";
    return null;
  };

  const handleSearch = () => {
    const err = validate();
    if (err) {
      setError(err);
      setTimeout(() => setError(""), 2500);
      return;
    }

    const query = new URLSearchParams({
      city: pickupLocation,
      pickupDate,
      dropoffDate,
      pickupTime,
      dropoffTime,
    }).toString();

    navigate(`/vehicles?${query}`);
  };

  /* ---------------------------------------------------------------------- */
  /* 🖥️ Desktop + 📱 Mobile (shifted lower in mobile)                       */
  /* ---------------------------------------------------------------------- */
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block relative z-20 bg-white/95 backdrop-blur-xl border border-sky-200 shadow-lg rounded-xl p-5 w-full max-w-md mx-auto text-black transition-all hover:shadow-xl hover:scale-[1.01]">
        <h2 className="text-[16px] font-bold mb-4 flex items-center justify-center text-sky-700">
          <Search className="w-5 h-5 mr-2 text-sky-600" /> Find Your Perfect Ride
        </h2>

        {error && (
          <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md text-xs animate-pulse">
            {error}
          </div>
        )}

        <div className="space-y-4 text-[15px]">
          <select
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Pickup Location</option>
            {LOCATIONS.map((loc) => (
              <option key={loc}>{loc}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            {/* Pickup Date */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">
                Pickup Date
              </label>
              <input
                type="date"
                min={today}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                className="p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white w-full cursor-pointer"
              />
            </div>

            {/* Pickup Time */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">
                Pickup Time
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                min={
                  pickupDate === today
                    ? new Date(Date.now() + 3600000)
                        .toISOString()
                        .slice(11, 16)
                    : "08:00"
                }
                max="23:30"
                className="p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white w-full cursor-pointer"
              />
            </div>

            {/* Drop-off Date */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">
                Drop-off Date
              </label>
              <input
                type="date"
                min={pickupDate}
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                className="p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white w-full cursor-pointer"
              />
            </div>

            {/* Drop-off Time */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">
                Drop-off Time
              </label>
              <input
                type="time"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                min="08:00"
                max="23:30"
                className="p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white w-full cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full py-3 mt-2 bg-sky-600 text-white text-[15px] font-semibold rounded-md hover:bg-sky-700 hover:scale-[1.05] transition-transform shadow-md"
          >
            Search Bikes
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden w-full max-w-sm mx-auto mt-20 px-4 text-white">
        {error && (
          <p className="text-xs bg-red-500/60 text-white text-center py-1 rounded mb-2">
            {error}
          </p>
        )}
        <div className="flex flex-col space-y-3">
          <select
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="bg-transparent border border-white/60 rounded-md px-3 py-2 text-sm placeholder-white focus:bg-white/20 focus:border-sky-300 outline-none cursor-pointer"
          >
            <option value="">Pickup Location</option>
            {LOCATIONS.map((loc) => (
              <option key={loc}>{loc}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            {/* Pickup Date */}
            <div>
              <label className="block text-xs mb-1 text-white/90">
                Pickup Date
              </label>
              <input
                type="date"
                min={today}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                className="bg-transparent border border-white/60 rounded-md px-2 py-2 text-sm text-white focus:bg-white/20 outline-none w-full cursor-pointer"
              />
            </div>

            {/* Pickup Time */}
            <div>
              <label className="block text-xs mb-1 text-white/90">
                Pickup Time
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                min={
                  pickupDate === today
                    ? new Date(Date.now() + 3600000)
                        .toISOString()
                        .slice(11, 16)
                    : "08:00"
                }
                max="23:30"
                className="bg-transparent border border-white/60 rounded-md px-2 py-2 text-sm text-white focus:bg-white/20 outline-none w-full cursor-pointer"
              />
            </div>

            {/* Drop-off Date */}
            <div>
              <label className="block text-xs mb-1 text-white/90">
                Drop-off Date
              </label>
              <input
                type="date"
                min={pickupDate}
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                className="bg-transparent border border-white/60 rounded-md px-2 py-2 text-sm text-white focus:bg-white/20 outline-none w-full cursor-pointer"
              />
            </div>

            {/* Drop-off Time */}
            <div>
              <label className="block text-xs mb-1 text-white/90">
                Drop-off Time
              </label>
              <input
                type="time"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                onFocus={(e) => e.target.showPicker?.()}
                min="08:00"
                max="23:30"
                className="bg-transparent border border-white/60 rounded-md px-2 py-2 text-sm text-white focus:bg-white/20 outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-sky-600/80 hover:bg-sky-700 text-white py-2 rounded-md font-medium text-sm transition"
          >
            Search Bikes
          </button>
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* 🏍️ Landing Page Component                                                  */
/* -------------------------------------------------------------------------- */
const LandingPage = () => {
  const [salePreview, setSalePreview] = useState([]);
  const [selectedSaleBike, setSelectedSaleBike] = useState(null);
  const [imageModalSrc, setImageModalSrc] = useState(null);
  const collectionsRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/sale-bikes/latest?limit=6`)
      .then((res) => setSalePreview(res.data.bikes || []))
      .catch(() => setSalePreview([]));
  }, []);

  const scrollToCollections = () =>
    collectionsRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="font-[Poppins] text-gray-700 bg-white">
      <Navbar onSaleClick={scrollToCollections} />

      {/* HERO SECTION */}
      <section className="relative min-h-[100vh] flex flex-col justify-center items-center text-center overflow-hidden px-6">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HeroImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-sky-900/40 to-transparent" />
        <div className="relative z-10 mt-[-4rem]">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white drop-shadow-lg mb-4 tracking-wide">
            YOUR JOURNEY{" "}
            <span className="bg-gradient-to-r from-[#0F172A] to-sky-600 bg-clip-text text-transparent">
              OUR BIKES
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-medium text-[#0F172A] max-w-2xl mx-auto bg-white/70 px-3 py-1 rounded-md shadow-sm">
            Explore Bangalore with comfort, power, and elegance.
          </p>
        </div>

        <div className="relative z-20 w-full flex flex-col justify-center items-center mt-9 space-y-2">
          <SearchWidget />
          <div className="block md:hidden">
            <button
              onClick={scrollToCollections}
              className="bg-gradient-to-r from-[#0F172A] to-sky-600 text-white py-2 px-6 rounded-lg font-semibold shadow-md hover:from-[#1E293B] hover:to-sky-500 transition text-sm animate-pulse"
            >
              We also sell Bikes — Check Out!
            </button>
          </div>
        </div>

        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C360,120 1080,0 1440,60 L1440,120 L0,120 Z"
            fill="#E0F2FE"
          />
        </svg>
      </section>

      {/* OUR COLLECTIONS SECTION */}
      <section
        ref={collectionsRef}
        className="relative bg-[#E0F2FE] py-20 px-8 text-center overflow-hidden"
      >
        <div
          className="absolute inset-0 flex justify-center items-center pointer-events-none"
          style={{
            backgroundImage: `url(${Logo})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "100%",
            opacity: 0.09,
            filter: "blur(0.9px)",
          }}
        ></div>

        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-sky-800">
            Our Collections
          </h2>
          <div className="mx-auto mt-3 w-24 h-1 rounded bg-sky-600" />

          <div className="mt-8 mb-10 flex justify-center">
            <button
              onClick={() => (window.location.href = "/sale-bikes")}
              className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden rounded-full bg-gradient-to-r from-[#0F172A] to-sky-600 text-white font-semibold shadow-md transition-all hover:shadow-lg hover:scale-[1.05]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-sky-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
              <span className="relative flex items-center gap-2">
                <Eye className="w-5 h-5 text-white" />
                View All Bikes
              </span>
            </button>
          </div>

          {/* ✅ Cards replaced with SaleBikeCard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mt-6 max-w-6xl mx-auto">
            {salePreview.length === 0 ? (
              <p className="col-span-full text-gray-600">
                No bikes available right now.
              </p>
            ) : (
              salePreview.map((b) => (
                <SaleBikeCard
                  key={b._id}
                  bike={b}
                  onView={(bike) => setSelectedSaleBike(bike)}
                  onImageClick={(img) => setImageModalSrc(img)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ABOUT CITY */}
      <section className="bg-gradient-to-r from-sky-700 to-sky-500 text-white py-20 px-8 text-center">
        <h2 className="text-3xl font-extrabold mb-6">
          Bike Rentals in Bangalore
        </h2>
        <div className="max-w-4xl mx-auto text-sm md:text-base leading-relaxed opacity-95">
          <p>
            Bangalore, the Garden City of India, offers perfect weather and
            endless opportunities for exploration. Rent a bike and breeze
            through the traffic while enjoying the city's beauty and freedom.
          </p>
          <p className="mt-4">
            Whether you're visiting Cubbon Park, Nandi Hills, or MG Road —
            riding with NewBikeWorld gives you flexibility, comfort, and the joy
            of discovery.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] text-white py-8 text-center">
        <p className="text-sm">
          &copy; 2024 NewBikeWorld. All rights reserved.
        </p>
      </footer>

      {/* IMAGE MODAL */}
      {imageModalSrc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setImageModalSrc(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageModalSrc(null);
            }}
            className="absolute top-6 right-6 text-white hover:text-gray-300"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={imageModalSrc}
            alt="Zoomed Bike"
            className="max-h-[90vh] w-auto rounded-lg shadow-lg object-contain transition-all"
          />
        </div>
      )}
    </div>
  );
};

export default LandingPage;

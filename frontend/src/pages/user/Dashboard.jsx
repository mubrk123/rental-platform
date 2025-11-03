// frontend/src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Eye, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import HeroImg from "../../assets/HeroImg4.png";
import Logo from "../../assets/logo2.png";
import axios from "axios";

const LOCATIONS = [
  "All Locations",
  "Lalbagh",
  "NagaVara",
  "Residency Road",
  "Gandhi Nagar",
];


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
          

          {/* Bike for Sale button */}
          <button
            onClick={onSaleClick}
            className="ml-4 bg-gradient-to-r from-[#0F172A] to-sky-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md animate-pulse hover:from-[#1E293B] hover:to-sky-500 transition"
          >
            Bike for Sale
          </button>
        </nav>

        <button
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 md:hidden animate-slideDown">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block text-gray-800 font-medium py-2 hover:text-sky-600"
              >
                {link.name}
              </a>
            ))}
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

const SearchWidget = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [pickupDate, setPickupDate] = useState(today);
  const [dropoffDate, setDropoffDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [error, setError] = useState("");

  const pickupTimeRef = useRef(null);
  const dropoffDateRef = useRef(null);
  const dropoffTimeRef = useRef(null);

  const openPicker = (ref) => ref?.current?.showPicker?.();

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

  return (
    <div className="relative z-20 bg-white/95 backdrop-blur-xl border border-sky-200 shadow-lg rounded-xl p-5 w-full max-w-md mx-auto text-black transition-all hover:shadow-xl hover:scale-[1.01]">
      <h2 className="text-[16px] font-bold mb-4 flex items-center justify-center text-sky-700">
        <Search className="w-5 h-5 mr-2 text-sky-600" /> Find Your Perfect Ride
      </h2>

      {error && (
        <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md text-xs animate-pulse">
          {error}
        </div>
      )}

      <div className="space-y-4 text-[15px]">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Pickup Location
          </label>
          <select
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
          >
            <option value="">Select a location</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pickup Date
            </label>
            <input
              type="date"
              value={pickupDate}
              min={today}
              onChange={(e) => {
                setPickupDate(e.target.value);
                setTimeout(() => openPicker(pickupTimeRef), 150);
              }}
              className="w-full p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pickup Time
            </label>
            <input
              type="time"
              ref={pickupTimeRef}
              value={pickupTime}
              min="08:30"
              max="23:30"
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Drop-off Date
            </label>
            <input
              type="date"
              ref={dropoffDateRef}
              value={dropoffDate}
              min={pickupDate}
              onChange={(e) => setDropoffDate(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Drop-off Time
            </label>
            <input
              type="time"
              ref={dropoffTimeRef}
              value={dropoffTime}
              min="08:30"
              max="23:30"
              onChange={(e) => setDropoffTime(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-100 focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="w-full py-3 mt-2 bg-sky-600 text-white text-[15px] font-semibold rounded-md hover:bg-sky-700 hover:scale-[1.05] focus:ring-2 focus:ring-sky-400 transition-transform shadow-md"
        >
          Search Bikes
        </button>
      </div>
    </div>
  );
};


const LandingPage = () => {
  const [salePreview, setSalePreview] = useState([]);
  const [selectedSaleBike, setSelectedSaleBike] = useState(null);
  const [imageModalSrc, setImageModalSrc] = useState(null);
  const collectionsRef = useRef(null);

  const imageBase = import.meta.env.VITE_API_URL.replace("/api", "");

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

      {/* HERO */}
      <section className="relative min-h-[100vh] flex flex-col justify-center items-center text-center overflow-hidden px-6">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HeroImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-sky-900/40 to-transparent" />
        <div className="relative z-10 mt-[-4rem]">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white drop-shadow-lg mb-4 tracking-wide">
            YOUR JOURNEY <span className="text-sky-500">OUR BIKES</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-medium text-[#0F172A] max-w-2xl mx-auto bg-white/70 px-3 py-1 rounded-md shadow-sm">
            Explore Bangalore with comfort, power, and elegance.
          </p>
        </div>

        <div className="relative z-20 w-full flex flex-col justify-center items-center mt-9 space-y-2">
          <SearchWidget />
          {/* Added new mobile-only button below search */}
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

      {/* OUR COLLECTIONS SECTION (fully restored) */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mt-12 max-w-6xl mx-auto">
            {salePreview.length === 0 ? (
              <p className="col-span-full text-gray-600">
                No bikes available right now.
              </p>
            ) : (
              salePreview.map((b) => {
                const img = b.images?.[0] && `${imageBase}${b.images[0]}`;
                return (
                  <div
                    key={b._id}
                    className="relative bg-white rounded-2xl p-6 shadow-md hover:-translate-y-3 hover:shadow-lg transition-transform duration-300"
                  >
                    <img
                      src={img || "https://placehold.co/400x300?text=No+Image"}
                      alt={b.modelName}
                      className="w-full h-48 object-contain bg-sky-50 p-4 rounded-lg mb-4 cursor-pointer"
                      onClick={() => setImageModalSrc(img)}
                    />
                    <h3 className="text-xl font-semibold text-sky-800">
                      {b.brand} {b.modelName}
                    </h3>
                    <p className="text-gray-600 mb-4">₹{b.price}</p>
                    <div className="flex items-center gap-3 justify-center">
                      <button
                        onClick={() => setSelectedSaleBike(b)}
                        className="bg-sky-600 text-white py-2 px-5 rounded-lg font-semibold hover:bg-sky-700 hover:scale-105 transition-all"
                      >
                        <Eye className="inline w-4 h-4 mr-1" />
                        View Details
                      </button>
                      <a
                        href="tel:6202673708"
                        className="border border-sky-300 text-sky-700 py-2 px-5 rounded-lg font-semibold hover:bg-sky-50"
                      >
                        Contact
                      </a>
                    </div>
                  </div>
                );
              })
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
        <p className="text-sm">&copy; 2024 NewBikeWorld. All rights reserved.</p>
      </footer>

      {/* MODALS */}
      {selectedSaleBike && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative p-6">
            <button
              onClick={() => setSelectedSaleBike(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-3 text-blue-700">
              {selectedSaleBike.modelName}
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Brand:</strong> {selectedSaleBike.brand}
              </p>
              <p>
                <strong>Year:</strong> {selectedSaleBike.year || "—"}
              </p>
              <p>
                <strong>Price:</strong> ₹{selectedSaleBike.price}
              </p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedSaleBike.description || "No description available"}
              </p>
            </div>
            {selectedSaleBike.images?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {selectedSaleBike.images.map((img, i) => {
                  const src = `${imageBase}${img}`;
                  return (
                    <img
                      key={i}
                      src={src}
                      alt={`bike-${i}`}
                      className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                      onClick={() => setImageModalSrc(src)}
                    />
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <a
                href="tel:6202673708"
                className="bg-sky-600 text-white py-2 px-5 rounded-lg font-semibold hover:bg-sky-700 hover:scale-105 transition-all"
              >
                Contact
              </a>
              <button
                onClick={() => setSelectedSaleBike(null)}
                className="border border-gray-300 py-2 px-5 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="absolute top-6 right-6 text-white"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={imageModalSrc}
            alt="Zoomed"
            className="max-h-[90vh] w-auto rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default LandingPage;

import Location from "../models/Location.js";

const defaultLocations = [
  {
    name: "Lalbagh",
    locationCode: "LBG",
    address: "New Bike World, Lalbagh, Bengaluru",
    mapsLink: "https://www.google.com/maps?q=12.9484431,77.5794489(New+Bike+World,+Lalbagh)&z=17",
    handlerName: "Lalbagh Handler",
    handlerPhone: "+919620655960",
    isActive: true,
  },
  {
    name: "Nagavara",
    locationCode: "NGV",
    address: "New Bike World, Nagvara, Bengaluru",
    mapsLink: "https://www.google.com/maps?q=13.0409877,77.6217596(New+Bike+World,+Nagvara)&z=17",
    handlerName: "Nagavara Handler",
    handlerPhone: "+919066661717",
    isActive: true,
  },
  {
    name: "Residency Road",
    locationCode: "RSR",
    address: "New Bike World, Residency Road, Bengaluru",
    mapsLink: "https://www.google.com/maps?q=12.9688081,77.6017841(New+Bike+World,+Residency+Road)&z=17",
    handlerName: "Residency Road Handler",
    handlerPhone: "+919113699335",
    isActive: true,
  },
  {
    name: "Majestic (Gandhi Nagar)",
    locationCode: "GNG",
    address: "FabHotel Royale Basant Residency, Gandhi Nagar, Bengaluru",
    mapsLink: "https://www.google.com/maps?q=12.978336,77.574905(FabHotel+Royale+Basant+Residency,+Gandhi+Nagar)&z=17",
    handlerName: "Majestic Handler",
    handlerPhone: "+919845382618",
    isActive: true,
  },
];

export const seedLocations = async () => {
  try {
    const count = await Location.countDocuments();
    if (count === 0) {
      await Location.insertMany(defaultLocations);
      console.log("✅ Default locations seeded into DB");
    }
  } catch (err) {
    console.error("❌ Location seeding failed:", err.message);
  }
};

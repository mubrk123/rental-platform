export const pickupLocations = {
  lalbagh: {
    name: "Lalbagh",
    address: "New Bike World, Lalbagh, Bengaluru",
    link: "https://www.google.com/maps?q=12.9484431,77.5794489(New+Bike+World,+Lalbagh)&z=17",
  },
  nagvara: {
    name: "Nagvara",
    address: "New Bike World, Nagvara, Bengaluru",
    link: "https://www.google.com/maps?q=13.0409877,77.6217596(New+Bike+World,+Nagvara)&z=17",
  },
  "residency road": {
    name: "Residency Road",
    address: "New Bike World, Residency Road, Bengaluru",
    link: "https://www.google.com/maps?q=12.9688081,77.6017841(New+Bike+World,+Residency+Road)&z=17",
  },
  "gandhi nagar": {
    name: "Gandhi Nagar",
    address: "FabHotel Royale Basant Residency, Gandhi Nagar, Bengaluru",
    link: "https://www.google.com/maps?q=12.978336,77.574905(FabHotel+Royale+Basant+Residency,+Gandhi+Nagar)&z=17",
  },
};

// ✅ Safe helper (optional)
export const getPickupLocation = (city) => {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  return pickupLocations[key] || null;
};

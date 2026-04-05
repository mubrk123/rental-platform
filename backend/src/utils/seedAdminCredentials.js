import bcrypt from "bcryptjs";
import AdminCredentials from "../models/AdminCredentials.js";
import Location from "../models/Location.js";

export const seedAdminCredentials = async () => {
  try {
    // Seed main admin if not exists
    const mainAdminExists = await AdminCredentials.findOne({ role: "mainAdmin" });
    if (!mainAdminExists) {
      const hash = await bcrypt.hash(process.env.MAIN_ADMIN_PASSWORD || "admin123", 10);
      await AdminCredentials.create({
        role: "mainAdmin",
        email: process.env.MAIN_ADMIN_EMAIL || "admin@newbikeworld.in",
        password: hash,
        locationId: null,
        locationName: "Main Admin",
      });
      console.log("✅ Main admin credentials seeded");
    }

    // Seed one handler per location if not already exists
    const locations = await Location.find().lean();
    for (const loc of locations) {
      const exists = await AdminCredentials.findOne({ role: "handler", locationId: loc._id });
      if (!exists) {
        const hash = await bcrypt.hash(process.env.HANDLER_PASSWORD || "handler123", 10);
        await AdminCredentials.create({
          role: "handler",
          email: `handler.${loc.locationCode.toLowerCase()}@newbikeworld.in`,
          password: hash,
          locationId: loc._id,
          locationName: loc.name,
        });
        console.log(`✅ Handler credentials seeded for ${loc.name}`);
      }
    }
  } catch (err) {
    console.error("❌ Admin credentials seeding failed:", err.message);
  }
};

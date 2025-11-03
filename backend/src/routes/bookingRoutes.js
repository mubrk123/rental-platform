// routes/bookingRoutes.js
import express from "express";
import multer from "multer";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import axios from "axios";
import { sendWhatsApp } from "../utils/notifyUser.js"; // ✅ Added

const router = express.Router();

// ✅ City → 3-letter code mapping
const locationCodes = {
  Lalbagh: "LBG",
  NagaVara: "NGV",
  "Residency Road": "RSR",
  "Gandhi Nagar": "GNG",
};

/* ------------------------------------------------------------------
   MULTER CONFIG
------------------------------------------------------------------ */
const pickupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/pickupPhotos";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadPickup = multer({ storage: pickupStorage });

/* ------------------------------------------------------------------
   GET ALL BOOKINGS
------------------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("vehicleId");
    res.json(bookings);
  } catch (err) {
    console.error("❌ Fetch bookings error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
});

/* ------------------------------------------------------------------
   MARK BOOKING RETURNED + DELETE FILES + SEND WHATSAPP
------------------------------------------------------------------ */
router.put("/complete/:id", async (req, res) => {
  const id = req.params.id;
  console.log("🟦 Marking booking as returned:", id);

  try {
    const booking = await Booking.findById(id).populate("vehicleId");
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    // ✅ 1️⃣ Update Vehicle Stock
    if (booking.vehicleId) {
      try {
        const vehicle = await Vehicle.findById(booking.vehicleId);
        if (vehicle) {
          vehicle.bookedQuantity = Math.max(0, (vehicle.bookedQuantity || 1) - 1);
          await vehicle.save();
          console.log("🚗 Updated vehicle stock:", vehicle.modelName);
        }
      } catch (err) {
        console.warn("⚠️ Vehicle stock update failed:", err.message);
      }
    }

    // ✅ 2️⃣ Delete all related files
    const deleteFile = (filePath) => {
      if (!filePath) return;
      const absPath = path.join(process.cwd(), filePath.replace(/^\//, ""));
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
        console.log("🗑️ Deleted:", absPath);
      }
    };

    deleteFile(booking.aadhaarDocument);
    deleteFile(booking.licenseDocument);
    deleteFile(booking.pickupPhoto);
    deleteFile(booking.pickupPDF);

    // ✅ 3️⃣ Send WhatsApp Thank-You Message
    const msg = `✅ Thank you for choosing *NewBikeWorld*! 
Your ride with ${booking.vehicleId?.brand || "our vehicle"} (${booking.vehicleId?.modelName || ""}) has been successfully returned. 
We hope you enjoyed your journey with us! 🚴‍♂️ 
Looking forward to serving you again.`;

    try {
      await sendWhatsApp(booking.phoneNumber, msg);
      console.log("📩 WhatsApp message sent successfully");
    } catch (err) {
      console.warn("⚠️ WhatsApp message failed:", err.message);
    }

    // ✅ 4️⃣ Delete booking record after message
    await Booking.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "✅ Booking marked as returned, files deleted & WhatsApp sent.",
    });
  } catch (err) {
    console.error("❌ Error completing booking:", err);
    res.status(500).json({
      success: false,
      message: "Server error while completing booking",
      error: err.message,
    });
  }
});

/* ------------------------------------------------------------------
   📸 UPLOAD PICKUP PHOTO + MERGE PDF
------------------------------------------------------------------ */
router.post("/:id/upload-pickup-photo", uploadPickup.single("pickupPhoto"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicleId");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (!req.file) return res.status(400).json({ success: false, message: "No pickup photo uploaded" });

    booking.pickupPhoto = `uploads/pickupPhotos/${req.file.filename}`;
    const pdfDir = "uploads/pdfs";
    fs.mkdirSync(pdfDir, { recursive: true });

    const summaryPath = path.join(pdfDir, `${booking._id}_summary.pdf`);
    const finalPath = path.join(pdfDir, `${booking._id}_merged.pdf`);

    // ✅ Create Summary PDF
    const doc = new PDFDocument({ margin: 50 });
    const summaryStream = fs.createWriteStream(summaryPath);
    doc.pipe(summaryStream);

    doc.fontSize(20).fillColor("#4f46e5").text("Vehicle Pickup Summary", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(12).fillColor("black").text(`Name: ${booking.name}`);
    doc.text(`Email: ${booking.email}`);
    doc.text(`Phone: ${booking.phoneNumber}`);
    doc.text(`City: ${booking.city}`);
    doc.moveDown(1);
    doc.text(`Vehicle: ${booking.vehicleId?.brand} ${booking.vehicleId?.modelName}`);
    doc.text(`Pickup Date: ${booking.pickupDate?.toISOString()?.slice(0, 10)}`);
    doc.text(`Dropoff Date: ${booking.dropoffDate?.toISOString()?.slice(0, 10)}`);
    doc.text(`Total Amount: ₹${booking.amount}`);
    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").text("Generated by NewBikeWorld Rental Portal", { align: "center" });
    doc.end();
    await new Promise((resolve) => summaryStream.on("finish", resolve));

    const finalPdf = await PDFLibDocument.create();

    // ✅ Fix watermark helper (pass finalPdf)
    const drawLogoWatermark = async (page, finalPdf) => {
      try {
        const logoPath = path.join(process.cwd(), "uploads/logo.png");
        if (fs.existsSync(logoPath)) {
          const logoBytes = fs.readFileSync(logoPath);
          const logoImg = await finalPdf.embedPng(logoBytes);
          const { width, height } = logoImg.scale(0.5);
          page.drawImage(logoImg, {
            x: (page.getWidth() - width) / 2,
            y: (page.getHeight() - height) / 2,
            width,
            height,
            opacity: 0.08,
          });
        }
      } catch (err) {
        console.warn("⚠️ Watermark skipped:", err.message);
      }
    };

    const addPdf = async (buffer) => {
      const pdf = await PDFLibDocument.load(buffer);
      const pages = await finalPdf.copyPages(pdf, pdf.getPageIndices());
      for (const p of pages) {
        await drawLogoWatermark(p, finalPdf);
        finalPdf.addPage(p);
      }
    };

    const addImage = async (buffer, label, filePath) => {
  try {
    const page = finalPdf.addPage([595.28, 841.89]);

    const ext = path.extname(filePath || "").toLowerCase();
    let image;
    if (ext === ".png") {
      image = await finalPdf.embedPng(buffer);
    } else if (ext === ".jpg" || ext === ".jpeg") {
      image = await finalPdf.embedJpg(buffer);
    } else {
      console.warn(`⚠️ Skipping unsupported image format: ${filePath}`);
      return;
    }

    const scaled = image.scaleToFit(500, 700);
    const x = (595.28 - scaled.width) / 2;
    const y = (841.89 - scaled.height) / 2;
    page.drawImage(image, { x, y, width: scaled.width, height: scaled.height });
    page.drawText(label, { x: 50, y: 760, size: 14, color: rgb(0.3, 0.3, 0.3) });
  } catch (err) {
    console.warn(`⚠️ Skipped invalid image (${filePath}):`, err.message);
  }
};


    const getBuffer = (url) => {
      if (!url) return null;
      const local = path.join(process.cwd(), url);
      return fs.existsSync(local) ? fs.readFileSync(local) : null;
    };

    await addPdf(fs.readFileSync(summaryPath));
    const aadhar = getBuffer(booking.aadhaarDocument);
    const license = getBuffer(booking.licenseDocument);
    const pickup = getBuffer(booking.pickupPhoto);
    const addFileToFinalPdf = async (buffer, label, filePath) => {
  try {
    const ext = path.extname(filePath || "").toLowerCase();

    if (ext === ".pdf") {
      console.log(`📄 Adding embedded PDF: ${filePath}`);
      await addPdf(buffer); // append its pages directly
    } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
      console.log(`🖼️ Adding image: ${filePath}`);
      await addImage(buffer, label, filePath); // embed image as page
    } else {
      console.warn(`⚠️ Skipping unsupported file: ${filePath}`);
    }
  } catch (err) {
    console.warn(`⚠️ Skipped file (${filePath}):`, err.message);
  }
};

if (aadhar) await addFileToFinalPdf(aadhar, "Aadhaar Document", booking.aadhaarDocument);
if (license) await addFileToFinalPdf(license, "License Document", booking.licenseDocument);
if (pickup) await addFileToFinalPdf(pickup, "Pickup Photo", booking.pickupPhoto);


    fs.unlinkSync(summaryPath);
    const finalBytes = await finalPdf.save();
    fs.writeFileSync(finalPath, finalBytes);

    booking.pickupPDF = `/uploads/pdfs/${booking._id}_merged.pdf`;
    await booking.save();

    res.json({
      success: true,
      message: "✅ Pickup photo uploaded and merged PDF created successfully.",
      pickupPhoto: booking.pickupPhoto,
      pickupPDF: booking.pickupPDF,
    });
  } catch (err) {
    console.error("❌ Upload pickup photo error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------------------
   🧾 DOWNLOAD MERGED PDF
------------------------------------------------------------------ */
router.get("/pdf/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminSecret = req.headers["x-admin-secret"] || req.query.admin_secret;

    if (adminSecret !== process.env.ADMIN_SECRET)
      return res.status(403).json({ error: "Unauthorized" });

    const booking = await Booking.findById(id).populate("vehicleId");
    if (!booking || !booking.pickupPDF)
      return res.status(404).json({ error: "PDF not found" });

    const pdfPath = path.join(process.cwd(), booking.pickupPDF.replace(/^\//, ""));
    if (!fs.existsSync(pdfPath))
      return res.status(404).json({ error: "File missing on server" });

    const locationCode =
      locationCodes[booking.city] || booking.city?.slice(0, 3).toUpperCase();
    const namePart = (booking.name || "Customer")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const pickupDate = booking.pickupDate
      ? new Date(booking.pickupDate).toLocaleDateString("en-GB").replace(/\//g, "-")
      : "DATE";

    const filename = `${locationCode}_${namePart}_${pickupDate}.pdf`;

    console.log("📦 Downloading:", filename);
    res.download(pdfPath, filename, (err) => {
      if (err) console.error("❌ File send error:", err);
    });
  } catch (err) {
    console.error("❌ PDF download error:", err);
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

export default router;

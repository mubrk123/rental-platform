import express from "express";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument, rgb, StandardFonts } from "pdf-lib";
import axios from "axios";
import fs from "fs";
import path from "path";
import { sendWhatsAppTemplate } from "../utils/notifyUser.js";
import { upload, uploadToCloudinary, cloudinary } from "../utils/upload.js";
import * as bookingController from "../controllers/bookingController.js";
const router = express.Router();

// ✅ City → 3-letter code mapping
const locationCodes = {
  Lalbagh: "LBG",
  NagaVara: "NGV",
  "Residency Road": "RSR",
  "Gandhi Nagar": "GNG",
};

/* ------------------------------------------------------------------
   CLOUDINARY PICKUP UPLOAD CONFIG
------------------------------------------------------------------ */
const uploadPickup = upload.single("pickupPhoto");

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

    // ✅ Delete files from Cloudinary
    const deleteFromCloudinary = async (url) => {
      if (!url || !url.includes("cloudinary.com")) return;
      try {
        const parts = url.split("/");
        const folder = parts[parts.length - 2];
        const file = parts[parts.length - 1].split(".")[0];
        const publicId = `${folder}/${file}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
        console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
      } catch (err) {
        console.warn("⚠️ Cloudinary delete failed:", err.message);
      }
    };

    await deleteFromCloudinary(booking.aadhaarDocument);
    await deleteFromCloudinary(booking.licenseDocument);
    await deleteFromCloudinary(booking.pickupPhoto);

    // ✅ Update vehicle stock
    if (booking.vehicleId) {
      const vehicle = await Vehicle.findById(booking.vehicleId);
      if (vehicle) {
        vehicle.bookedQuantity = Math.max(0, (vehicle.bookedQuantity || 1) - 1);
        await vehicle.save();
      }
    }

    // ✅ WhatsApp Thank-You Template (via Twilio)
    try {
      await sendWhatsAppTemplate(booking.phoneNumber, "THANK_YOU", {
        1: booking.name,
        2: `${booking.vehicleId?.brand || ""} ${booking.vehicleId?.modelName || ""}`,
      });
      console.log(`💬 Thank-you message sent to ${booking.phoneNumber}`);
    } catch (err) {
      console.warn("⚠️ WhatsApp Thank-You template failed:", err.message);
    }

    // ✅ Admin WhatsApp Alert
    try {
      await sendAdminAlert(
        `✅ Booking completed by ${booking.name}\n📍 ${booking.city}\n🚲 ${booking.vehicleId?.brand || ""} ${booking.vehicleId?.modelName || ""}\n🗓️ ${new Date(booking.pickupDate).toDateString()} → ${new Date(booking.dropoffDate).toDateString()}`
      );
    } catch (err) {
      console.warn("⚠️ Admin WhatsApp alert failed:", err.message);
    }

    // ✅ Thank-You Email
    if (booking.email) {
      try {
        await sendEmail(booking.email, {
          name: booking.name,
          bookingId: booking._id,
          vehicleId: booking.vehicleId?._id || "N/A",
          city: booking.city,
          pickupDate: booking.pickupDate,
          dropoffDate: booking.dropoffDate,
          phoneNumber: booking.phoneNumber,
          completed: true,
        });
        console.log(`📧 Thank-you email sent to ${booking.email}`);
      } catch (err) {
        console.warn("⚠️ Thank-You email failed:", err.message);
      }
    }

    // ✅ Delete booking record after completion
    await Booking.findByIdAndDelete(id);
    console.log(`🗑️ Booking ${id} deleted successfully.`);

    res.json({ success: true, message: "Booking marked as returned and files deleted." });
  } catch (err) {
    console.error("❌ Error completing booking:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

/* ------------------------------------------------------------------
   📸 UPLOAD PICKUP PHOTO + MERGE CLOUDINARY FILES INTO PDF
------------------------------------------------------------------ */
router.post("/:id/upload-pickup-photo", uploadPickup, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicleId");
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });
    if (!req.file)
      return res.status(400).json({ success: false, message: "No pickup photo uploaded" });

    // ✅ Upload pickup photo to Cloudinary
    booking.pickupPhoto = await uploadToCloudinary(req.file, "pickupPhotos");

    // Prepare output directories
    const pdfDir = "uploads/pdfs";
    fs.mkdirSync(pdfDir, { recursive: true });
    const summaryPath = path.join(pdfDir, `${booking._id}_summary.pdf`);
    const finalPath = path.join(pdfDir, `${booking._id}_merged.pdf`);

    /* STEP 1: Generate Enhanced Pickup Summary PDF */
    const doc = new PDFDocument({ 
      margin: 0,
      size: 'A4',
      info: {
        Title: `Vehicle Pickup Summary - ${booking._id}`,
        Author: 'NewBikeWorld Rental Portal',
        Subject: 'Vehicle Rental Pickup Documentation'
      }
    });
    
    const stream = fs.createWriteStream(summaryPath);
    doc.pipe(stream);

    // ===== HEADER SECTION =====
    doc.fillColor('#1e3a8a')
       .rect(0, 0, doc.page.width, 100)
       .fill();
    
    // Company Logo/Name
    doc.fillColor('#ffffff')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('NEWBIKEWORLD', 50, 35)
       .fontSize(14)
       .text('Vehicle Pickup Summary', 50, 60);
    
    // Generation Date
    const now = new Date();
    doc.fontSize(8)
       .text(`Generated: ${now.toLocaleDateString('en-IN')}`, 400, 45, { align: 'right' })
       .text(`Time: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, 400, 60, { align: 'right' });

    // ===== CUSTOMER INFORMATION SECTION =====
    let yPosition = 130;
    
    // Section Header
    createSectionHeader(doc, 'CUSTOMER INFORMATION', yPosition);
    yPosition += 25;

    // Validate and format customer data
    const customerDetails = [
      { label: 'Full Name', value: formatText(booking.name) },
      { label: 'Email', value: formatEmail(booking.email) },
      { label: 'Phone', value: formatPhone(booking.phoneNumber) },
      { label: 'City', value: formatText(booking.city) }
    ];

    customerDetails.forEach((detail, index) => {
      const y = yPosition + (index * 20);
      createDetailRow(doc, detail.label, detail.value, 60, y);
    });

    yPosition += 100;

    // ===== VEHICLE DETAILS SECTION =====
    createSectionHeader(doc, 'VEHICLE DETAILS', yPosition);
    yPosition += 25;

    // Validate vehicle data

    // ===== BOOKING DETAILS SECTION =====
    createSectionHeader(doc, 'BOOKING DETAILS', yPosition);
    yPosition += 25;

    // Validate and format booking dates
    const pickupDate = booking.pickupDate ? formatDate(booking.pickupDate) : 'Not set';
    const dropoffDate = booking.dropoffDate ? formatDate(booking.dropoffDate) : 'Not set';
    const totalAmount = booking.amount ? `₹${booking.amount}` : 
                       (booking.vehicleId?.rentPerDay ? `₹${booking.vehicleId.rentPerDay}` : 'Not available');

    const bookingDetails = [
      { label: 'Pickup Date', value: pickupDate },
      { label: 'Dropoff Date', value: dropoffDate },
      { label: 'Total Amount', value: totalAmount },
      { label: 'Booking ID', value: formatBookingId(booking._id.toString()) }
    ];

    bookingDetails.forEach((detail, index) => {
      const y = yPosition + (index * 20);
      createDetailRow(doc, detail.label, detail.value, 60, y);
    });

    yPosition += 100;

    // ===== STATUS BADGE =====
    const statusWidth = 120;
    const statusHeight = 25;
    doc.fillColor('#059669')
       .roundedRect(50, yPosition, statusWidth, statusHeight, 3)
       .fill();
    
    doc.fillColor('#ffffff')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('PICKUP CONFIRMED', 65, yPosition + 8);

    yPosition += 50;

    // ===== TERMS AND CONDITIONS =====
    createSectionHeader(doc, 'TERMS & CONDITIONS', yPosition);
    yPosition += 20;

    const terms = [
      '• The customer is responsible for the vehicle during the rental period.',
      '• Any damages will be charged as per company policy.',
      '• Fuel charges are not included in the rental amount.',
      '• Late returns will incur additional charges.',
      '• Original documents must be presented during vehicle pickup.',
      '• Security deposit is refundable upon safe vehicle return.'
    ];

    terms.forEach((term, index) => {
      doc.fillColor('#4b5563')
         .fontSize(8)
         .font('Helvetica')
         .text(term, 60, yPosition + (index * 15), { width: 480 });
    });

    // ===== FOOTER =====
    const footerY = doc.page.height - 40;
    doc.fillColor('#9ca3af')
       .fontSize(8)
       .font('Helvetica')
       .text('Thank you for choosing NewBikeWorld - Your trusted rental partner', 
             50, footerY, { align: 'center', width: doc.page.width - 100 });

    // Page border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
       .strokeColor('#e5e7eb')
       .lineWidth(1)
       .stroke();

    doc.end();
    await new Promise((resolve) => stream.on("finish", resolve));

    /* STEP 2: Enhanced Document Merging with Clean Image Pages */
    const finalPdf = await PDFLibDocument.create();
    //const { rgb } = PDFLib;

    const addPdf = async (buffer) => {
      try {
        const pdf = await PDFLibDocument.load(buffer);
        const pages = await finalPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => finalPdf.addPage(p));
      } catch (error) {
        console.error('Error adding PDF:', error);
      }
    };

    const addImage = async (buffer, label, mimeType = "image/jpeg") => {
      try {
        const page = finalPdf.addPage([595.28, 841.89]);
        const helveticaBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await finalPdf.embedFont(StandardFonts.Helvetica);
        
        // Clean Header background
        page.drawRectangle({
          x: 0,
          y: 770,
          width: 595.28,
          height: 50,
          color: rgb(0.12, 0.23, 0.54),
        });

        // Document title
        page.drawText(label, {
          x: 50,
          y: 785,
          size: 16,
          color: rgb(1, 1, 1),
          font: helveticaBold,
        });

        page.drawText('NewBikeWorld - Rental Documentation', {
          x: 50,
          y: 765,
          size: 8,
          color: rgb(1, 1, 1),
          font: helvetica,
        });

        let image;
        if (mimeType.includes("png")) {
          image = await finalPdf.embedPng(buffer);
        } else {
          image = await finalPdf.embedJpg(buffer);
        }

        // Scale image to fit nicely within the page with margins
        const maxWidth = 500;
        const maxHeight = 650;
        const scaled = image.scaleToFit(maxWidth, maxHeight);
        
        const x = (595.28 - scaled.width) / 2;
        const y = (700 - scaled.height) / 2;

        // Draw image with border
        page.drawRectangle({
          x: x - 5,
          y: y - 5,
          width: scaled.width + 10,
          height: scaled.height + 10,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        page.drawImage(image, { 
          x, 
          y, 
          width: scaled.width, 
          height: scaled.height 
        });

        // Clean Footer - only our branding
        page.drawText(`Document Generated: ${now.toLocaleDateString('en-IN')}`, {
          x: 50,
          y: 30,
          size: 8,
          color: rgb(0.4, 0.4, 0.4),
          font: helvetica,
        });

        page.drawText('NewBikeWorld Rental Portal', {
          x: 400,
          y: 30,
          size: 8,
          color: rgb(0.4, 0.4, 0.4),
          font: helvetica,
        });
      } catch (error) {
        console.error(`Error adding image ${label}:`, error);
      }
    };

    const fetchRemoteFile = async (url) => {
      try {
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
        return Buffer.from(res.data);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch file: ${url}`, error.message);
        return null;
      }
    };

    // Add summary PDF first
    try {
      await addPdf(fs.readFileSync(summaryPath));
    } catch (error) {
      console.error('Error adding summary PDF:', error);
    }

    // Add all documents with proper labeling
    const files = [
      { url: booking.aadhaarDocument, label: "Aadhaar Card", mimeType: "image/jpeg" },
      { url: booking.licenseDocument, label: "Driving License", mimeType: "image/jpeg" },
      { url: booking.pickupPhoto, label: "Vehicle Pickup Photo", mimeType: "image/jpeg" },
    ];

    for (const file of files) {
      if (!file.url) {
        console.log(`⚠️ Skipping ${file.label} - URL not available`);
        continue;
      }
      
      try {
        const buffer = await fetchRemoteFile(file.url);
        if (!buffer) {
          console.log(`⚠️ Skipping ${file.label} - Failed to fetch`);
          continue;
        }
        
        // Check if buffer is PDF
        const isPDF = buffer.length > 4 && buffer.slice(0, 4).toString() === '%PDF';
        
        if (isPDF) {
          console.log(`📄 Adding ${file.label} as PDF`);
          await addPdf(buffer);
        } else {
          console.log(`🖼️ Adding ${file.label} as image`);
          await addImage(buffer, file.label, file.mimeType || "image/jpeg");
        }
      } catch (error) {
        console.error(`Error processing ${file.label}:`, error);
      }
    }

    const finalBytes = await finalPdf.save();
    fs.writeFileSync(finalPath, finalBytes);
    
    // Clean up temporary file
    if (fs.existsSync(summaryPath)) {
      fs.unlinkSync(summaryPath);
    }

    booking.pickupPDF = `/uploads/pdfs/${booking._id}_merged.pdf`;
    await booking.save();

    res.json({
      success: true,
      message: "✅ Professional PDF created and all documents merged successfully.",
      pickupPhoto: booking.pickupPhoto,
      pickupPDF: booking.pickupPDF,
    });
  } catch (err) {
    console.error("❌ Upload pickup photo error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== HELPER FUNCTIONS =====

function createSectionHeader(doc, title, yPosition) {
  doc.fillColor('#1e293b')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text(title, 50, yPosition);
  
  doc.moveTo(50, yPosition + 5)
     .lineTo(545, yPosition + 5)
     .lineWidth(1)
     .strokeColor('#1e293b')
     .stroke();
}

function createDetailRow(doc, label, value, x, y) {
  const labelWidth = 100;
  
  doc.fillColor('#374151')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text(`${label}:`, x, y, { width: labelWidth });
  
  // Handle multi-line values
  const valueLines = doc.heightOfString(value, { width: 400 });
  if (valueLines > 15) {
    // If value is too long, split into multiple lines
    doc.fillColor('#6b7280')
       .fontSize(9)
       .font('Helvetica')
       .text(value, x + labelWidth, y, { width: 380, lineBreak: true });
    return y + valueLines + 5;
  } else {
    doc.fillColor('#6b7280')
       .fontSize(9)
       .font('Helvetica')
       .text(value, x + labelWidth, y, { width: 380 });
    return y + 15;
  }
}

function formatText(text) {
  if (!text) return 'Not provided';
  return String(text).trim() || 'Not provided';
}

function formatEmail(email) {
  if (!email) return 'Not provided';
  const cleanEmail = String(email).trim().toLowerCase();
  // Basic email validation
  if (cleanEmail.includes('@') && cleanEmail.includes('.')) {
    return cleanEmail;
  }
  return 'Invalid email format';
}

function formatPhone(phone) {
  if (!phone) return 'Not provided';
  const cleanPhone = String(phone).replace(/\D/g, ''); // Remove non-digits
  if (cleanPhone.length >= 10) {
    return cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return 'Invalid phone number';
}

function formatDate(date) {
  if (!date) return 'Not set';
  try {
    return new Date(date).toLocaleDateString('en-IN');
  } catch {
    return 'Invalid date';
  }
}

function formatBookingId(bookingId) {
  if (!bookingId) return 'Not available';
  return String(bookingId).replace(/\s/g, ''); // Remove any spaces
}
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

    const locationCode = locationCodes[booking.city] || booking.city?.slice(0, 3).toUpperCase();
    const namePart = (booking.name || "Customer").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    const pickupDate = booking.pickupDate
      ? new Date(booking.pickupDate).toLocaleDateString("en-GB").replace(/\//g, "-")
      : "DATE";

    const filename = `${locationCode}_${namePart}_${pickupDate}.pdf`;
    res.download(pdfPath, filename);
  } catch (err) {
    console.error("❌ PDF download error:", err);
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

router.put("/:id/mark-pdf-downloaded", bookingController.markPdfDownloaded);

/* ------------------------------------------------------------------
   📅 GET UPCOMING BOOKINGS FOR A SPECIFIC VEHICLE
------------------------------------------------------------------ */
router.get("/upcoming/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // ✅ Validate vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // ✅ Find bookings with dropoffDate > today
    const today = new Date();
    const upcoming = await Booking.find({
      vehicleId,
      dropoffDate: { $gte: today },
    })
      .sort({ pickupDate: 1 })
      .select("name phoneNumber pickupDate dropoffDate city email")
      .lean();

    res.json({ success: true, bookings: upcoming });
  } catch (err) {
    console.error("❌ Error fetching upcoming bookings:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching upcoming bookings",
    });
  }
});

// 📁 backend/routes/bookingRoutes.js
router.get("/status/:vehicleId", async (req, res) => {
  try {
    const booking = await Booking.findOne({ vehicleId: req.params.vehicleId }).sort({ createdAt: -1 });
    if (!booking) return res.json({ success: false });
    res.json({ success: true, booking });
  } catch {
    res.status(500).json({ success: false });
  }
});


export default router;

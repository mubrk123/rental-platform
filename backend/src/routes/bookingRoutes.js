// src/routes/bookingRoutes.js
import express from "express";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument, rgb, StandardFonts } from "pdf-lib";
import axios from "axios";
import fs from "fs";
import path from "path";
import { sendWhatsAppTemplate } from "../utils/notifyUser.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSMS } from "../utils/twilioClient.js";
import { upload, uploadToCloudinary, cloudinary } from "../utils/upload.js";
import { pickupLocations } from "../utils/locationMap.js";
import * as bookingController from "../controllers/bookingController.js";
const router = express.Router();

// City → 3-letter code mapping (kept from your original)
const locationCodes = {
  Lalbagh: "LBG",
  NagaVara: "NGV",
  "Residency Road": "RSR",
  "Gandhi Nagar": "GNG",
};

// multer single
const uploadPickup = upload.single("pickupPhoto");

/* ------------------------------------------------------------------
   HELPERS: Admin & Handler Alerts (WhatsApp + SMS)
   - uses your existing sendWhatsAppTemplate and sendSMS utils
------------------------------------------------------------------ */
const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || process.env.MAIN_ADMIN_NUMBER;
const ADMIN_SMS_NUMBER = process.env.MAIN_ADMIN_NUMBER || process.env.ADMIN_WHATSAPP_NUMBER;
const DEFAULT_HANDLER_NUMBER = process.env.DEFAULT_HANDLER_NUMBER || process.env.HANDLER_PHONE || null;

async function sendHandlerAlert(handlerPayload = {}) {
  try {
    // Prefer handler phone from pickupLocations if available
    const handlerPhone =
      (handlerPayload && handlerPayload.handlerPhone) ||
      (handlerPayload.city && (pickupLocations[handlerPayload.city?.toLowerCase()]?.handlerPhone)) ||
      DEFAULT_HANDLER_NUMBER;

    if (!handlerPhone) {
      console.warn("⚠️ sendHandlerAlert: handler phone not configured");
      return;
    }

    // WhatsApp template to handler (uses a generic template name BOOKING_ALERT_HANDLER)
    try {
      await sendWhatsAppTemplate(handlerPhone, "BOOKING_ALERT_HANDLER", {
        1: handlerPayload.name || "Customer",
        2: handlerPayload.city || "Location",
        3: handlerPayload.bookingId || handlerPayload.id || "N/A",
      });
      console.log("✅ Handler WhatsApp alert sent");
    } catch (e) {
      console.warn("⚠️ Handler WhatsApp failed:", e?.message || e);
    }

    // SMS to handler (plain)
    try {
      const smsMsg = `Booking returned: ${handlerPayload.name || "Customer"} - ${handlerPayload.bookingId || ""} at ${handlerPayload.city ||
        "Location"}.`;
      await sendSMS(handlerPhone, smsMsg);
      console.log("✅ Handler SMS sent");
    } catch (e) {
      console.warn("⚠️ Handler SMS failed:", e?.message || e);
    }
  } catch (err) {
    console.error("❌ sendHandlerAlert error:", err);
  }
}

async function sendAdminAlert(adminPayload = {}) {
  try {
    // WhatsApp to admin (template)
    if (ADMIN_WHATSAPP_NUMBER) {
      try {
        await sendWhatsAppTemplate(ADMIN_WHATSAPP_NUMBER, "BOOKING_ALERT_ADMIN", {
          1: adminPayload.name || "Customer",
          2: adminPayload.city || "Location",
          3: adminPayload.vehicle || "Vehicle",
          4: adminPayload.bookingId || "N/A",
        });
        console.log("✅ Admin WhatsApp alert sent");
      } catch (e) {
        console.warn("⚠️ Admin WhatsApp failed:", e?.message || e);
      }
    } else {
      console.warn("⚠️ ADMIN_WHATSAPP_NUMBER not configured");
    }

    // SMS to main admin number
    if (ADMIN_SMS_NUMBER) {
      try {
        const smsMsg = `Booking completed: ${adminPayload.name || "Customer"} | ${adminPayload.vehicle || ""} | ${adminPayload.city ||
          ""} | ID: ${adminPayload.bookingId || "N/A"}`;
        await sendSMS(ADMIN_SMS_NUMBER, smsMsg);
        console.log("✅ Admin SMS sent");
      } catch (e) {
        console.warn("⚠️ Admin SMS failed:", e?.message || e);
      }
    } else {
      console.warn("⚠️ ADMIN_SMS_NUMBER not configured");
    }
  } catch (err) {
    console.error("❌ sendAdminAlert error:", err);
  }
}

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
   MARK BOOKING RETURNED (DO NOT delete DB record) + DELETE CLOUDINARY FILES + NOTIFY
------------------------------------------------------------------ */
router.put("/complete/:id", async (req, res) => {
  const id = req.params.id;
  console.log("🟦 Marking booking as returned:", id);

  try {
    const booking = await Booking.findById(id).populate("vehicleId");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Safe Cloudinary delete helper
    const deleteFromCloudinary = async (url) => {
      try {
        if (!url) return;
        // If URL is local (starts with /uploads) skip cloudinary deletion
        if (!url.includes("cloudinary.com")) {
          console.log("ℹ️ Not a cloudinary URL, skipping:", url);
          return;
        }
        const parts = url.split("/");
        // typical cloudinary url: https://res.cloudinary.com/<cloud>/image/upload/v12345/folder/file.jpg
        // public id is path after /upload/ up to extension
        const uploadIndex = parts.findIndex((p) => p === "upload");
        if (uploadIndex === -1) {
          console.warn("⚠️ Can't derive publicId for cloudinary URL:", url);
          return;
        }
        const publicIdParts = parts.slice(uploadIndex + 1); // includes version and path
        // remove version if present (v1234)
        if (publicIdParts[0] && publicIdParts[0].startsWith("v")) publicIdParts.shift();
        // remove file extension
        const last = publicIdParts.pop();
        const filenameNoExt = last.includes(".") ? last.substring(0, last.lastIndexOf(".")) : last;
        publicIdParts.push(filenameNoExt);
        const publicId = publicIdParts.join("/");
        await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
        console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
      } catch (err) {
        console.warn("⚠️ Cloudinary delete failed:", err?.message || err);
      }
    };

    // Delete cloudinary files safely (aadhaar, license, pickupPhoto) — if they are cloudinary URLs
    await deleteFromCloudinary(booking.aadhaarDocument);
    await deleteFromCloudinary(booking.licenseDocument);
    await deleteFromCloudinary(booking.pickupPhoto);

    // Update vehicle stock: decrement bookedQuantity safely
    if (booking.vehicleId) {
      try {
        const vehicle = await Vehicle.findById(booking.vehicleId);
        if (vehicle) {
          vehicle.bookedQuantity = Math.max(0, (Number(vehicle.bookedQuantity) || 0) - 1);
          await vehicle.save();
        }
      } catch (err) {
        console.warn("⚠️ Error updating vehicle stock:", err?.message || err);
      }
    }

    // Mark booking completed (DO NOT delete the DB record)
    booking.status = "completed";
    booking.completedAt = new Date();
    await booking.save();

    // Notify the user (WhatsApp thank you template)
    try {
      await sendWhatsAppTemplate(booking.phoneNumber, "THANK_YOU", {
        1: booking.name || "Customer",
        2: `${booking.vehicleId?.brand || ""} ${booking.vehicleId?.modelName || ""}`,
      });
      console.log(`💬 Thank-you WhatsApp sent to ${booking.phoneNumber}`);
    } catch (err) {
      console.warn("⚠️ WhatsApp THANK_YOU failed:", err?.message || err);
    }

    
    // Thank you email to customer (optional)
    if (booking.email) {
      try {
        await sendEmail(booking.email, {
          name: booking.name,
          bookingId: booking.bookingId || booking._id.toString(),
          vehicleName: booking.vehicleId?.brand || "",
          vehicleModel: booking.vehicleId?.modelName || "",
          city: booking.city,
          pickupDate: booking.pickupDate,
          dropoffDate: booking.dropoffDate,
          phoneNumber: booking.phoneNumber,
          completed: true,
        });
        console.log(`📧 Thank-you email sent to ${booking.email}`);
      } catch (err) {
        console.warn("⚠️ Thank-you email failed:", err?.message || err);
      }
    }

    res.json({ success: true, message: "Booking marked completed. Files deleted from Cloudinary. Notifications sent." });
  } catch (err) {
    console.error("❌ Error completing booking:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

/* ------------------------------------------------------------------
   UPLOAD PICKUP PHOTO + MERGE CLOUDINARY FILES INTO PDF
   (keeps merged PDF on server in uploads/pdfs)
------------------------------------------------------------------ */
router.post("/:id/upload-pickup-photo", uploadPickup, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("vehicleId");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (!req.file) return res.status(400).json({ success: false, message: "No pickup photo uploaded" });

    // Upload pickup photo to Cloudinary and save URL
    try {
      booking.pickupPhoto = await uploadToCloudinary(req.file, "pickupPhotos");
    } catch (err) {
      console.warn("⚠️ uploadToCloudinary failed for pickup photo:", err?.message || err);
      // proceed anyway; pickupPhoto might be null
    }

    // Prepare PDF output directory
    const pdfDir = path.join(process.cwd(), "uploads", "pdfs");
    fs.mkdirSync(pdfDir, { recursive: true });
    const summaryPath = path.join(pdfDir, `${booking._id}_summary.pdf`);
    const finalPath = path.join(pdfDir, `${booking._id}_merged.pdf`);

    // STEP 1: create summary PDF (same as you had)
    const doc = new PDFDocument({
      margin: 0,
      size: "A4",
      info: {
        Title: `Vehicle Pickup Summary - ${booking._id}`,
        Author: "NewBikeWorld Rental Portal",
        Subject: "Vehicle Rental Pickup Documentation",
      },
    });

    const stream = fs.createWriteStream(summaryPath);
    doc.pipe(stream);

    // header
    doc.fillColor("#1e3a8a").rect(0, 0, doc.page.width, 100).fill();
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("NEWBIKEWORLD", 50, 35).fontSize(14).text("Vehicle Pickup Summary", 50, 60);

    const now = new Date();
    doc.fontSize(8).text(`Generated: ${now.toLocaleDateString("en-IN")}`, 400, 45, { align: "right" })
      .text(`Time: ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`, 400, 60, { align: "right" });

    // customer info
    let yPosition = 130;
    createSectionHeader(doc, "CUSTOMER INFORMATION", yPosition);
    yPosition += 25;
    const customerDetails = [
      { label: "Full Name", value: formatText(booking.name) },
      { label: "Email", value: formatEmail(booking.email) },
      { label: "Phone", value: formatPhone(booking.phoneNumber) },
      { label: "City", value: formatText(booking.city) },
    ];
    customerDetails.forEach((detail, index) => {
      const y = yPosition + index * 20;
      createDetailRow(doc, detail.label, detail.value, 60, y);
    });
    yPosition += 100;

    // vehicle & booking details
    createSectionHeader(doc, "VEHICLE DETAILS", yPosition);
    yPosition += 25;
    createSectionHeader(doc, "BOOKING DETAILS", yPosition);
    yPosition += 25;
    const pickupDate = booking.pickupDate ? formatDate(booking.pickupDate) : "Not set";
    const dropoffDate = booking.dropoffDate ? formatDate(booking.dropoffDate) : "Not set";
    const totalAmount = booking.amount ? `₹${booking.amount}` : (booking.vehicleId?.rentPerDay ? `₹${booking.vehicleId.rentPerDay}` : "Not available");
    const bookingDetails = [
      { label: "Pickup Date", value: pickupDate },
      { label: "Dropoff Date", value: dropoffDate },
      { label: "Total Amount", value: totalAmount },
      { label: "Booking ID", value: formatBookingId(booking.bookingId || booking._id.toString()) },
    ];
    bookingDetails.forEach((detail, index) => {
      const y = yPosition + index * 20;
      createDetailRow(doc, detail.label, detail.value, 60, y);
    });
    yPosition += 100;

    // status badge + terms + footer
    const statusWidth = 120;
    const statusHeight = 25;
    doc.fillColor("#059669").roundedRect(50, yPosition, statusWidth, statusHeight, 3).fill();
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("PICKUP CONFIRMED", 65, yPosition + 8);
    yPosition += 50;

    createSectionHeader(doc, "TERMS & CONDITIONS", yPosition);
    yPosition += 20;
    const terms = [
      "• The customer is responsible for the vehicle during the rental period.",
      "• Any damages will be charged as per company policy.",
      "• Fuel charges are not included in the rental amount.",
      "• Late returns will incur additional charges.",
      "• Original documents must be presented during vehicle pickup.",
      "• Security deposit is refundable upon safe vehicle return.",
    ];
    terms.forEach((term, index) => {
      doc.fillColor("#4b5563").fontSize(8).font("Helvetica").text(term, 60, yPosition + index * 15, { width: 480 });
    });

    const footerY = doc.page.height - 40;
    doc.fillColor("#9ca3af").fontSize(8).font("Helvetica").text("Thank you for choosing NewBikeWorld - Your trusted rental partner", 50, footerY, { align: "center", width: doc.page.width - 100 });
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeColor("#e5e7eb").lineWidth(1).stroke();

    doc.end();
    await new Promise((resolve) => stream.on("finish", resolve));

    // STEP 2: Merge summary and remote docs/images into final PDF using pdf-lib
    const finalPdf = await PDFLibDocument.create();

    const addPdf = async (buffer) => {
      try {
        const pdf = await PDFLibDocument.load(buffer);
        const pages = await finalPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => finalPdf.addPage(p));
      } catch (error) {
        console.error("Error adding PDF:", error);
      }
    };

    const addImage = async (buffer, label, mimeType = "image/jpeg") => {
      try {
        const page = finalPdf.addPage([595.28, 841.89]);
        const helveticaBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await finalPdf.embedFont(StandardFonts.Helvetica);
        page.drawRectangle({ x: 0, y: 770, width: 595.28, height: 50, color: rgb(0.12, 0.23, 0.54) });
        page.drawText(label, { x: 50, y: 785, size: 16, color: rgb(1, 1, 1), font: helveticaBold });
        page.drawText("NewBikeWorld - Rental Documentation", { x: 50, y: 765, size: 8, color: rgb(1, 1, 1), font: helvetica });

        let image;
        if (mimeType.includes("png")) image = await finalPdf.embedPng(buffer);
        else image = await finalPdf.embedJpg(buffer);

        const maxWidth = 500;
        const maxHeight = 650;
        const scaled = image.scaleToFit(maxWidth, maxHeight);
        const x = (595.28 - scaled.width) / 2;
        const y = (700 - scaled.height) / 2;

        page.drawRectangle({ x: x - 5, y: y - 5, width: scaled.width + 10, height: scaled.height + 10, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
        page.drawImage(image, { x, y, width: scaled.width, height: scaled.height });
        page.drawText(`Document Generated: ${now.toLocaleDateString("en-IN")}`, { x: 50, y: 30, size: 8, color: rgb(0.4, 0.4, 0.4), font: helvetica });
        page.drawText("NewBikeWorld Rental Portal", { x: 400, y: 30, size: 8, color: rgb(0.4, 0.4, 0.4), font: helvetica });
      } catch (error) {
        console.error(`Error adding image ${label}:`, error);
      }
    };

    const fetchRemoteFile = async (url) => {
      try {
        // if local path (starts with /uploads), read from disk
        if (url && url.startsWith("/uploads")) {
          const p = path.join(process.cwd(), url.replace(/^\//, ""));
          if (fs.existsSync(p)) return fs.readFileSync(p);
          return null;
        }
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
        return Buffer.from(res.data);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch file: ${url}`, error.message);
        return null;
      }
    };

    // add summary
    try {
      await addPdf(fs.readFileSync(summaryPath));
    } catch (error) {
      console.error("Error adding summary PDF:", error);
    }

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
        const isPDF = buffer.length > 4 && buffer.slice(0, 4).toString() === "%PDF";
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

    // save merged pdf locally on server
    const finalBytes = await finalPdf.save();
    fs.writeFileSync(finalPath, finalBytes);

    // cleanup summary temporary
    if (fs.existsSync(summaryPath)) {
      try {
        fs.unlinkSync(summaryPath);
      } catch (e) {
        console.warn("⚠️ Couldn't delete summary temp file:", e?.message || e);
      }
    }

    // store local path into booking (so admin can download later)
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

/* ------------------------------------------------------------------
   DOWNLOAD MERGED PDF (admin only) - deletes server copy AFTER successful download
------------------------------------------------------------------ */
router.get("/pdf/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminSecret = req.headers["x-admin-secret"] || req.query.admin_secret;
    if (adminSecret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: "Unauthorized" });

    const booking = await Booking.findById(id).populate("vehicleId");
    if (!booking || !booking.pickupPDF) return res.status(404).json({ error: "PDF not found" });

    const pdfPath = path.join(process.cwd(), booking.pickupPDF.replace(/^\//, ""));
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "File missing on server" });

    const locationCode = locationCodes[booking.city] || booking.city?.slice(0, 3).toUpperCase();
    const namePart = (booking.name || "Customer").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    const pickupDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString("en-GB").replace(/\//g, "-") : "DATE";
    const filename = `${locationCode}_${namePart}_${pickupDate}.pdf`;

    // Stream download and then delete server file after response finishes successfully
    res.download(pdfPath, filename, async (err) => {
      if (err) {
        console.error("❌ Error during PDF download:", err);
        // don't delete file if download failed
      } else {
        // mark pdf downloaded (if you have controller function)
        try {
          // call internal controller to mark as downloaded if that route exists
          if (bookingController && typeof bookingController.markPdfDownloaded === "function") {
            try {
              await bookingController.markPdfDownloaded({ params: { id } }, { json: () => {} });
            } catch (e) {
              // ignore; markPdfDownloaded route might expect req/res shapes; we'll update DB directly instead
            }
          }
          // mark in DB as fallback
          booking.pdfDownloaded = true;
          await booking.save();
        } catch (e) {
          console.warn("⚠️ Could not mark pdfDownloaded flag:", e?.message || e);
        }

        // delete server file to free space
        try {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            console.log("🗑️ Server PDF deleted after successful download:", pdfPath);
            // also clear booking.pickupPDF so future references won't try to download missing file
            booking.pickupPDF = "";
            await booking.save();
          }
        } catch (e) {
          console.warn("⚠️ Failed to delete server PDF after download:", e?.message || e);
        }
      }
    });
  } catch (err) {
    console.error("❌ PDF download error:", err);
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

router.put("/:id/mark-pdf-downloaded", bookingController.markPdfDownloaded);

/* ------------------------------------------------------------------
   UPCOMING BOOKINGS FOR A SPECIFIC VEHICLE
------------------------------------------------------------------ */
router.get("/upcoming/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const today = new Date();
    const upcoming = await Booking.find({ vehicleId, dropoffDate: { $gte: today } })
      .sort({ pickupDate: 1 })
      .select("name phoneNumber pickupDate dropoffDate city email")
      .lean();

    res.json({ success: true, bookings: upcoming });
  } catch (err) {
    console.error("❌ Error fetching upcoming bookings:", err);
    res.status(500).json({ success: false, message: "Server error while fetching upcoming bookings" });
  }
});

router.get("/status/:vehicleId", async (req, res) => {
  try {
    const booking = await Booking.findOne({ vehicleId: req.params.vehicleId }).sort({ createdAt: -1 });
    if (!booking) return res.json({ success: false });
    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ status error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;

/* ---------------------------
   Helper functions used above
--------------------------- */
function createSectionHeader(doc, title, yPosition) {
  doc.fillColor("#1e293b").fontSize(12).font("Helvetica-Bold").text(title, 50, yPosition);
  doc.moveTo(50, yPosition + 5).lineTo(545, yPosition + 5).lineWidth(1).strokeColor("#1e293b").stroke();
}
function createDetailRow(doc, label, value, x, y) {
  const labelWidth = 100;
  doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold").text(`${label}:`, x, y, { width: labelWidth });
  const valueLines = doc.heightOfString(String(value || ""), { width: 400 });
  if (valueLines > 15) {
    doc.fillColor("#6b7280").fontSize(9).font("Helvetica").text(String(value || ""), x + labelWidth, y, { width: 380, lineBreak: true });
    return y + valueLines + 5;
  } else {
    doc.fillColor("#6b7280").fontSize(9).font("Helvetica").text(String(value || ""), x + labelWidth, y, { width: 380 });
    return y + 15;
  }
}
function formatText(text) {
  if (!text) return "Not provided";
  return String(text).trim() || "Not provided";
}
function formatEmail(email) {
  if (!email) return "Not provided";
  const cleanEmail = String(email).trim().toLowerCase();
  if (cleanEmail.includes("@") && cleanEmail.includes(".")) return cleanEmail;
  return "Invalid email format";
}
function formatPhone(phone) {
  if (!phone) return "Not provided";
  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length >= 10) return cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  return "Invalid phone number";
}
function formatDate(date) {
  if (!date) return "Not set";
  try {
    return new Date(date).toLocaleDateString("en-IN");
  } catch {
    return "Invalid date";
  }
}
function formatBookingId(bookingId) {
  if (!bookingId) return "Not available";
  return String(bookingId).replace(/\s/g, "");
}

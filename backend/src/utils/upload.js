import multer from "multer";
import path from "path";
import fs from "fs";
import keys from "../config/keys.js";

const UPLOAD_DIR = keys.uploadDir;

// ensure folders exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.join(UPLOAD_DIR, "documents"))) fs.mkdirSync(path.join(UPLOAD_DIR, "documents"), { recursive: true });
if (!fs.existsSync(path.join(UPLOAD_DIR, "vehicles"))) fs.mkdirSync(path.join(UPLOAD_DIR, "vehicles"), { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // fieldname 'documents' for user docs, 'images' for vehicle images
    const folder = file.fieldname === "images" ? "vehicles" : "documents";
    const dest = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
    cb(null, `${Date.now()}_${safe}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImage = /jpeg|jpg|png/;
  const allowedDocs = /pdf|jpeg|jpg|png/;
  const ext = (path.extname(file.originalname) || "").toLowerCase().replace(".", "");

  if (file.fieldname === "images") {
    return allowedImage.test(ext) ? cb(null, true) : cb(new Error("Only images allowed for images"));
  }
  if (file.fieldname === "documents") {
    return allowedDocs.test(ext) ? cb(null, true) : cb(new Error("Only pdf/jpg/png allowed for documents"));
  }
  cb(null, false);
};

export const upload = multer({ storage, fileFilter });

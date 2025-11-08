import multer from "multer";
import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// 1️⃣ Multer in-memory setup
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// 2️⃣ Cloudinary setup
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3️⃣ Upload function
export const uploadToCloudinary = (file, folder = "documents") => {
  return new Promise((resolve, reject) => {
    if (!file) {
      console.warn("⚠️ uploadToCloudinary called with no file, skipping upload.");
      return resolve(null);
    }

    const mimetype = file.mimetype || "";
    const uploadOptions = {
      folder,
      resource_type: "auto",
      transformation: mimetype.startsWith("image/")
        ? [{ quality: "auto", fetch_format: "auto" }]
        : undefined,
    };

    const stream = cloudinary.v2.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error("❌ Cloudinary upload failed:", error.message);
        return reject(error);
      }
      console.log("✅ Uploaded to Cloudinary:", result.secure_url);
      resolve(result.secure_url);
    });

    try {
      let bufferData = file.buffer;

      // 🧩 Fix: handle ArrayBuffer, base64, and bloated payloads
      if (!(bufferData instanceof Buffer)) {
        bufferData = Buffer.from(bufferData);
      }

      // 🚨 If file size is abnormally large for a small document, attempt base64 decode
      if (file.size > 10 * 1024 * 1024 && bufferData.toString("utf8").startsWith("data:")) {
        console.warn("⚠️ Oversized base64-encoded upload detected, decoding...");
        const matches = bufferData.toString().match(/^data:.*;base64,(.*)$/);
        if (matches) bufferData = Buffer.from(matches[1], "base64");
      }

      stream.end(bufferData);
    } catch (err) {
      console.error("⚠️ Stream error:", err.message);
      reject(err);
    }
  });
};

export { cloudinary };

// middleware/adminAuth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Missing authorization header" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not an admin" });
    }

    req.admin = decoded; // ✅ store decoded info if needed
    next();
  } catch (err) {
    console.error("Admin auth error:", err.message);
    return res
      .status(401)
      .json({ message: "Invalid or expired admin token" });
  }
};

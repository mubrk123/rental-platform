// middleware/adminAuth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

/**
 * ✅ Verify any admin (main or handler)
 */
export const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Missing authorization header" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Must be an admin token (role: "admin")
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not an admin" });
    }

    req.admin = decoded; // store decoded payload
    next();
  } catch (err) {
    console.error("Admin auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
};

/**
 * ✅ Verify only the Main Admin (single-step version — no chaining needed)
 */
export const verifyMainAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Missing authorization header" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check both role and main admin flag
    if (decoded.role !== "admin" || !decoded.isMainAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied: Main admin only" });
    }

    req.admin = decoded; // Attach decoded admin info to request
    next();
  } catch (err) {
    console.error("Main admin verification error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

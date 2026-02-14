import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// This middleware function checks if the user is authenticated
export async function protectedRoute(req, res, next) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Service Unavailable: Database not connected" });
        }
        const token = req.cookies.token; // Get the token from cookies
        // Check if the token exists
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: "Server misconfigured: JWT_SECRET is not set" });
        }
        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            // Token invalid/expired -> treat as unauthenticated
            const name = jwtError?.name || "";
            if (name === "JsonWebTokenError" || name === "TokenExpiredError" || name === "NotBeforeError") {
                return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
            }
            throw jwtError;
        }
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }
        // Find the user by ID
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // Attach user to request object
        req.user = user;
        next(); // Proceed to the next middleware or route handler
    }catch (error) {
        res.status(500).json({ error: error?.message || "Server Error"});
    }

}
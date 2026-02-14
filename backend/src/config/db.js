import mongoose from "mongoose";


export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully");
        console.log("Database:", mongoose.connection.db.databaseName);
        return true;
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        if (process.env.DB_REQUIRED === "true") {
            process.exit(1); // Exit the process with failure
        }
        return false;
    }
}
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/joga-bonito";

  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;

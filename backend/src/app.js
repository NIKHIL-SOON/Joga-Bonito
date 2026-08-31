import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import gameRoutes from "./routes/game.routes.js";

dotenv.config();

const app = express();

// Parse allowed origins from environment variable (supports comma-separated list)
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow non-browser clients (curl, Postman, server-to-server, health checks)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, "");

    // 2. Allow explicitly configured origins from FRONTEND_URL
    if (configuredOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // 3. Allow any Vercel, Render, or Netlify deployment
    const isCloudDomain =
      cleanOrigin.endsWith(".vercel.app") ||
      cleanOrigin.endsWith(".onrender.com") ||
      cleanOrigin.endsWith(".netlify.app");

    // 4. Allow local development on any port (localhost / 127.0.0.1)
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);

    if (isCloudDomain || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

// Mount CORS middleware at the very top before any other middlewares or routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Joga-Bonito API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "joga-bonito-backend",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/games", gameRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
  });
});

export default app;
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
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

export default app;
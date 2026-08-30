import { Router } from "express";
import {
  createSession,
  endSession,
  getSessions,
  getSessionStats,
  getAdaptiveLog,
} from "../controllers/sessions.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getSessions);
router.get("/stats", authMiddleware, getSessionStats);
router.get("/adaptive-log", authMiddleware, getAdaptiveLog);
router.post("/create", authMiddleware, createSession);
router.post("/end", authMiddleware, endSession);

export default router;

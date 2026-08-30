import { Router } from "express";
import { createSession, endSession } from "../controllers/sessions.controllers.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create", authMiddleware, createSession);
router.post("/end", authMiddleware, endSession);

export default router;

import { Router } from "express";
import { registerUser, login, getMe, logoutUser } from "../controllers/auth.controllers.js";
import { registerUserValidator, loginUserValidator } from "../validators/auth.validators.js";
import { validateUser } from "../middlewares/validateUser.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUserValidator(), validateUser, registerUser);
router.post("/login", loginUserValidator(), validateUser, login);
router.get("/me", authMiddleware, getMe);
router.post("/logout", authMiddleware, logoutUser);

export default router;
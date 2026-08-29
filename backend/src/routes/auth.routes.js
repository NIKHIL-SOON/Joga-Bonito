import { Router } from "express";
import { registerUser, login } from "../controllers/auth.controllers.js";
import { registerUserValidator, loginUserValidator } from "../validators/auth.validators.js";
import { validateUser } from "../middlewares/validateUser.middleware.js";

const router = Router();

router.post("/register", registerUserValidator(), validateUser, registerUser);
router.post("/login", loginUserValidator(), validateUser, login);

export default router;
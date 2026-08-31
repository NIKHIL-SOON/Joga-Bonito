// Single source of truth for the backend's base URL. Set VITE_API_URL in
// .env when the backend runs somewhere other than the default below.
import dotenv from "dotenv"
dotenv.config()
export const API_BASE = process.env.VITE_API_URL 

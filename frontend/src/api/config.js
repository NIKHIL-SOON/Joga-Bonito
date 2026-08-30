// Single source of truth for the backend's base URL. Set VITE_API_URL in
// .env when the backend runs somewhere other than the default below.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

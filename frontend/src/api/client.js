import axios from "axios";
import { API_BASE } from "./config";

// Shared axios instance — every API module builds on this instead of
// calling fetch() directly, so base URL, credentials, and headers only
// live in one place.
const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Normalize every failure into one shape so callers don't each need their
// own try/catch boilerplate to tell "server said no" apart from "never got
// a response at all" (offline, CORS block, wrong port, server down, etc.).
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      const payload = error.response.data;
      return Promise.reject({
        message: payload?.message || payload?.errors?.[0]?.msg || "Something went wrong",
        statusCode: error.response.status,
        errors: payload?.errors || [],
        isNetworkError: false,
      });
    }
    return Promise.reject({
      message: "Could not reach the server. Please try again.",
      statusCode: 0,
      errors: [],
      isNetworkError: true,
    });
  }
);

export default client;

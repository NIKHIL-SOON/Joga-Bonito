import client from "./client";

class AuthApiError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.name = "AuthApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

async function request(path, { method = "POST", body } = {}) {
  try {
    const res = await client.request({ url: path, method, data: body });
    return res.data?.data;
  } catch (err) {
    // client.js's interceptor already normalized this into { message, statusCode, errors }.
    throw new AuthApiError(err.message, err.statusCode, err.errors);
  }
}

export function registerUser({ name, email, password }) {
  return request("/auth/register", { body: { name, email, password } });
}

export function loginUser({ email, password }) {
  return request("/auth/login", { body: { email, password } });
}

export function fetchCurrentUser() {
  return request("/auth/me", { method: "GET" });
}

export function logoutUser() {
  return request("/auth/logout", { method: "POST" });
}

export { AuthApiError };

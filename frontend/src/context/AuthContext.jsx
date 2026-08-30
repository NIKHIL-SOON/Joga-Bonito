import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  registerUser,
  loginUser,
  fetchCurrentUser,
  logoutUser as logoutRequest,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // restoring session on first load

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    // Registration doesn't log the user in server-side (no cookies are set),
    // so sign them in right after so the dashboard loads immediately.
    await registerUser(details);
    return login({ email: details.email, password: details.password });
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF5] dark:bg-slate-900">
      <div className="w-8 h-8 rounded-full border-2 border-[#2563EB]/30 border-t-[#2563EB] animate-spin" />
    </div>
  );
}

/** Only reachable when logged in; otherwise bounces to /login. */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** The login/signup page — if already logged in, skip straight to the dashboard. */
export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./i18n";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/RouteGuards";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import GamesPage from "./pages/dashboard/GamesPage";
import ProgressPage from "./pages/dashboard/ProgressPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import MemoryMatchGame from "./pages/dashboard/games/MemoryMatchGame";
import AttentionFlickerGame from "./pages/dashboard/games/AttentionFlickerGame";
import ShoppingCartGame from "./pages/dashboard/games/ShoppingCartGame";
import LeafDirectionGame from "./pages/dashboard/games/LeafDirectionGame";
import SimonPatternGame from "./pages/dashboard/games/SimonPatternGame";
import BalloonPopGame from "./pages/dashboard/games/BalloonPopGame";

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <AuthPage />
                  </PublicOnlyRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="games" element={<GamesPage />} />
                <Route path="games/memory-match" element={<MemoryMatchGame />} />
                <Route path="games/attention-flow" element={<AttentionFlickerGame />} />
                <Route path="games/shopping-cart" element={<ShoppingCartGame />} />
                <Route path="games/leaves-direction" element={<LeafDirectionGame />} />
                <Route path="games/simon-pattern" element={<SimonPatternGame />} />
                <Route path="games/balloon-pop" element={<BalloonPopGame />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;

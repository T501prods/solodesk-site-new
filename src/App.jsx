import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import CookieVpnBanner from "./components/CookieVpnBanner";
import ProtectedRoute from "./components/ProtectedRoute";

// --- Lazy-loaded pages (code-splitting) ---
const Home = lazy(() => import("./pages/Home"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const BookingForm = lazy(() => import("./pages/BookingForm"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// --- Small loader for Suspense ---
function Loader() {
  return <div className="p-6 text-white font-mono">Loading…</div>;
}

// --- Scroll to top on route change ---
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// --- 404 page ---
function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-gray-400 mb-6">That page doesn’t exist.</p>
        <a href="/" className="text-indigo-400 hover:text-indigo-300">Go home →</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <CookieVpnBanner />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/book" element={<BookingForm />} />

          {/* Public profile by booking link */}
          <Route path="/:bookingLink" element={<PublicProfile />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

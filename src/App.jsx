import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { account } from "./lib/appwrite";              // ✅ use shared instance
import CookieVpnBanner from "./components/CookieVpnBanner";

// --- Lazy-loaded pages (code-splitting) ---
const Home = lazy(() => import("./pages/Home"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
// const TestLogin = lazy(() => import("./pages/TestLogin")); // ❌ removed (file deleted)
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
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

// --- Auth guard for protected routes ---
function RequireAuth({ children }) {
  const [state, setState] = useState({ checking: true, authed: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await account.get();
        if (mounted) setState({ checking: false, authed: true });
      } catch {
        if (mounted) setState({ checking: false, authed: false });
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (state.checking) return <Loader />;
  if (!state.authed) return <Navigate to="/login" replace />;
  return children;
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

          {/* Public profile by booking link */}
          <Route path="/:bookingLink" element={<PublicProfile />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

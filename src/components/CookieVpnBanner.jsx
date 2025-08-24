// src/components/CookieVpnBanner.jsx
import { useEffect, useState } from "react";
import { account } from "../lib/appwrite";

export default function CookieVpnBanner() {
  const [issues, setIssues] = useState({
    cookies: false,
    storage: false,
    network: false,
  });
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checks = { cookies: false, storage: false, network: false };

    // 1) Cookies enabled?
    try {
      document.cookie = "solodesk_test=1; path=/";
      checks.cookies = !document.cookie.includes("solodesk_test=");
      // Clean up test cookie
      document.cookie =
        "solodesk_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    } catch {
      checks.cookies = true;
    }

    // 2) Storage available?
    try {
      const k = "__solodesk__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
    } catch {
      checks.storage = true;
    }

    // 3) Quick session probe (detects CORS/VPN blocking the Appwrite endpoint)
    // We don't block the UI—just signal issues if request fails for network reasons.
    (async () => {
      try {
        await account.get(); // will succeed if logged in, throw if not
      } catch (err) {
        // If it's an Appwrite auth error (401/403), that's fine.
        // If it's a network/CORS error, it's likely VPN/Adblock/CORS.
        const msg = String(err?.message || err);
        // Heuristic: browser network/CORS fetch failures often surface as TypeError or generic network errors
        if (
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("cors") ||
          msg.toLowerCase().includes("failed") ||
          msg.toLowerCase().includes("fetch")
        ) {
          checks.network = true;
        }
      } finally {
        setIssues(checks);
        setShow(checks.cookies || checks.storage || checks.network);
      }
    })();
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-900/30 border border-amber-700 text-amber-200 text-sm font-mono px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-start justify-between gap-4">
        <div>
          <strong className="block text-amber-300 mb-1">
            Having trouble signing in or booking?
          </strong>
          <ul className="list-disc ml-5 space-y-1">
            {issues.cookies && (
              <li>
                Cookies seem to be blocked. Please enable cookies for SoloDesk to
                keep you signed in.
              </li>
            )}
            {issues.storage && (
              <li>
                Local storage appears blocked. Some privacy settings/extensions
                can cause this.
              </li>
            )}
            {issues.network && (
              <li>
                We couldn’t reach our servers. If you’re using a VPN/ad-blocker,
                try turning it off or allowlist <code>solodesk.co.uk</code>.
              </li>
            )}
          </ul>
        </div>
        <button
          onClick={() => setShow(false)}
          className="shrink-0 bg-amber-700/40 hover:bg-amber-700/60 px-3 py-1 rounded"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

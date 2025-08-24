import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { account } from "../lib/appwrite";

// Tiny reusable pill
function FeaturePill({ label }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-md border border-gray-800 bg-gray-900 text-gray-300">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
      {label}
    </span>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const session = await account.get();
        setUser(session);
      } catch {
        setUser(null);
      }
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      window.location.reload(); // Or navigate to '/'
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Top Nav */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
        <nav className="space-x-6 text-sm">
          <a href="#features" className="text-gray-300 hover:text-white">
            Features
          </a>
          <Link to="/pricing" className="text-gray-300 hover:text-white">
            Pricing
          </Link>

          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-300 hover:text-white">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="text-gray-300 hover:text-white">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white">
                Login
              </Link>
              <Link to="/signup" className="text-gray-300 hover:text-white">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative text-center py-32 px-6 overflow-hidden font-mono text-white">
        {/* Background layers */}
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1f1f1f] via-black to-black"
          aria-hidden="true"
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-fuchsia-500/10 via-blue-500/10 to-transparent blur-3xl rounded-full pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-grid-slate-700/[0.05] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          aria-hidden="true"
        />

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight tracking-tight mb-4 whitespace-nowrap">
            One Link. Fully Booked.
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg">
            Whether you're a tattooist, nail tech, PT, or developer — SoloDesk helps you take bookings online,
            sync your calendar, and stay in control.
          </p>

          {!user ? (
            <div className="flex justify-center gap-4">
              <Link
                to="/signup"
                className="bg-white text-black px-6 py-3 rounded-lg text-base font-semibold hover:bg-gray-200 transition"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="border border-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-white hover:text-black transition"
              >
                Log In
              </Link>
            </div>
          ) : (
            <div className="flex justify-center">
              <Link
                to="/dashboard"
                className="bg-indigo-600 hover:bg-indigo-500 transition-colors duration-200 text-white font-semibold py-3 px-6 rounded-lg shadow-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* New / Coming Soon strip */}
      <section className="bg-black border-y border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-600/30">
            New
          </span>
          <span className="text-gray-300">Deposits at booking</span>
          <span className="hidden md:inline text-gray-700">•</span>
          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Coming soon
          </span>
          <span className="text-gray-300">Smart slot fill · Reviews widget · Analytics</span>
        </div>
      </section>

      {/* Calendar Placeholder */}
      <section className="bg-black px-6 py-24">
        <div className="flex justify-center">
          <div className="w-full max-w-[600px] aspect-[6/6.5] bg-gray-900 border border-gray-800 rounded-xl shadow-xl flex items-center justify-center text-gray-600 text-sm font-mono">
            Calendar UI Placeholder
          </div>
        </div>
      </section>

      {/* Value Statement */}
      <section className="relative px-6 py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-6">Share your link. Get booked. That's it.</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Your clients pick a time, you get notified. No back and forth, no awkward DMs. Just easy booking that works.
          </p>
        </div>
      </section>

      {/* How it works + Feature Pills */}
      <section className="bg-black px-6 py-24 text-white font-mono" id="features">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-20">How it works</h2>

          <div className="grid md:grid-cols-3 gap-10 text-left">
            {/* Step 1 */}
            <div className="relative bg-gradient-to-b from-[#0a0a0a] to-[#111827] rounded-xl border border-[#1f2937] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="text-sm tracking-wide text-gray-400 mb-3">Step 1</div>
              <h3 className="text-lg font-bold text-white mb-3">Set Availability</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Choose your preferred time slots — one-off sessions or recurring weekly availability. You’re in full
                control.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <FeaturePill label="Auto Timezone" />
                <FeaturePill label="Buffer Times" />
                <FeaturePill label="Calendar Sync" />
              </div>
              <div className="absolute top-0 right-0 p-2 text-xs text-gray-700 bg-[#0f172a] border border-[#1e293b] rounded-bl-md tracking-tight uppercase">
                Calendar API
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative bg-gradient-to-b from-[#0a0a0a] to-[#111827] rounded-xl border border-[#1f2937] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="text-sm tracking-wide text-gray-400 mb-3">Step 2</div>
              <h3 className="text-lg font-bold text-white mb-3">Share Your Link</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Instantly generate a custom booking URL. No more back-and-forths — just clean scheduling.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <FeaturePill label="Quick-Book Links" />
                <FeaturePill label="Branded Page" />
                <FeaturePill label="Promo Codes" />
              </div>
              <div className="absolute top-0 right-0 p-2 text-xs text-gray-700 bg-[#0f172a] border border-[#1e293b] rounded-bl-md tracking-tight uppercase">
                Instant Links
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative bg-gradient-to-b from-[#0a0a0a] to-[#111827] rounded-xl border border-[#1f2937] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="text-sm tracking-wide text-gray-400 mb-3">Step 3</div>
              <h3 className="text-lg font-bold text-white mb-3">Get Booked</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Your calendar updates in real-time. Confirmed bookings — no double-bookings, no manual work.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <FeaturePill label="Deposits" />
                <FeaturePill label="Email & SMS Reminders" />
                <FeaturePill label="Waitlist Auto-Fill" />
              </div>
              <div className="absolute top-0 right-0 p-2 text-xs text-gray-700 bg-[#0f172a] border border-[#1e293b] rounded-bl-md tracking-tight uppercase">
                Auto-Sync
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="bg-black text-center font-mono border-y border-gray-800 py-24 px-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-8">Trusted by Solo Businesses</h2>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-white text-sm tracking-wide">
          <span className="px-3 py-1 border border-gray-800 bg-gray-900 rounded-md hover:border-indigo-500 transition">
            Nail Artists
          </span>
          <span className="px-3 py-1 border border-gray-800 bg-gray-900 rounded-md hover:border-indigo-500 transition">
            Tattooists
          </span>
          <span className="px-3 py-1 border border-gray-800 bg-gray-900 rounded-md hover:border-indigo-500 transition">
            Developers
          </span>
          <span className="px-3 py-1 border border-gray-800 bg-gray-900 rounded-md hover:border-indigo-500 transition">
            Photographers
          </span>
          <span className="px-3 py-1 border border-gray-800 bg-gray-900 rounded-md hover:border-indigo-500 transition">
            Coaches
          </span>
        </div>
      </section>

      {/* Mini Testimonials */}
      <section className="bg-black px-6 py-12 border-b border-gray-800">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 text-sm">
          {[
            { q: "Filled my week in 48 hours.", a: "— Mia, Nail Artist" },
            { q: "Cut no-shows by 70% with deposits.", a: "— Jay, Tattooist" },
            { q: "Clients love the quick-book link.", a: "— Noor, PT" },
          ].map((t, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-300">
              <p>{t.q}</p>
              <p className="text-gray-500 mt-2">{t.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose SoloDesk */}
      <section className="bg-black px-6 py-24 text-white font-mono border-y border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16 tracking-tight">Why choose SoloDesk?</h2>

          <div className="grid md:grid-cols-3 gap-8 text-left text-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 transition hover:border-indigo-500/50 hover:shadow-xl">
              <div className="mb-4 text-indigo-400 text-xs uppercase tracking-widest">Fast Setup</div>
              <h3 className="text-lg font-semibold text-white mb-2">Launch in minutes</h3>
              <p className="text-gray-400">
                Get your custom booking page live fast — no code, no stress, just plug & play.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 transition hover:border-indigo-500/50 hover:shadow-xl">
              <div className="mb-4 text-indigo-400 text-xs uppercase tracking-widest">Built for Freelancers</div>
              <h3 className="text-lg font-semibold text-white mb-2">Fits around your schedule</h3>
              <p className="text-gray-400">
                Whether you're a developer, tattooist or coach, SoloDesk works around your hours.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 transition hover:border-indigo-500/50 hover:shadow-xl">
              <div className="mb-4 text-indigo-400 text-xs uppercase tracking-widest">Smart Calendar</div>
              <h3 className="text-lg font-semibold text-white mb-2">Always in sync</h3>
              <p className="text-gray-400">
                Manage your availability, let bookings flow in, and sync seamlessly with your tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon (harder features to ship later) */}
      <section className="bg-black px-6 py-20 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Coming Soon</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            We’re building premium tools that help you get booked faster and run smoother.
          </p>

          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Smart Slot Fill</h3>
              <p className="text-gray-400">
                Auto-suggests the best slots to reduce gaps and cluster bookings for you.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Reviews Widget</h3>
              <p className="text-gray-400">
                Collect feedback automatically and showcase reviews on your booking page.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Analytics Dashboard</h3>
              <p className="text-gray-400">
                Track bookings, busiest times, and conversion — make smarter decisions.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Recurring Bookings</h3>
              <p className="text-gray-400">
                Weekly sessions or packages in a single flow for loyal clients.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Consent / Waiver Forms</h3>
              <p className="text-gray-400">
                Clients complete forms before arrival — safely stored with their booking.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Advanced Promo Rules</h3>
              <p className="text-gray-400">
                First-time client discounts, bundles, and targeted offers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-gray-900 to-black py-20 px-6 text-center text-white font-mono border-y border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to get booked without the back-and-forth?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Create your booking page in minutes — no code, no hassle.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 transition-colors duration-200 text-white font-semibold py-3 px-6 rounded-lg shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 text-gray-500 text-sm font-mono">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} SoloDesk <span className="text-gray-600">by T501 Productions</span>. All
            rights reserved.
          </p>
          <a href="mailto:thomas@t501productions.co.uk" className="hover:text-white transition">
            Contact Us
          </a>
        </div>
      </footer>
    </div>
  );
}

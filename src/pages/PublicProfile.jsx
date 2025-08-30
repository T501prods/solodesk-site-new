// src/pages/PublicProfile.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { databases } from "../lib/appwrite";
import { Query } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const publicProfilesTableId = import.meta.env.VITE_PUBLIC_PROFILES_TABLE_ID;

// adjust these to your actual IDs
const profileCollectionId = "6885251200346111d297";     // profiles
const availabilityCollectionId = "6886202f003a8d48a2e2"; // availability

function fmtRange(startIso, endIso) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = s.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const st  = s.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const et  = e.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${st} – ${et}`;
}

export default function PublicProfile() {
  const { bookingLink } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");

      if (!publicProfilesTableId) {
        setErr("Public profiles table id missing. Set VITE_PUBLIC_PROFILES_TABLE_ID.");
        setLoading(false);
        return;
      }

      try {
        // 1) lookup booking link -> userId (doc id = bookingLink)
        const mapping = await databases.getDocument(
          databaseId,
          publicProfilesTableId,
          bookingLink
        );
        if (!alive) return;
        const uid = mapping.userId;
        setUserId(uid);

        // 2) load provider profile (optional)
        try {
          const res = await databases.listDocuments(databaseId, profileCollectionId, [
            Query.equal("userId", uid),
            Query.limit(1),
          ]);
          if (!alive) return;
          setProfile(res.documents[0] || null);
        } catch {
          // profile missing is OK
        }

        // 3) load upcoming availability (next 12 weeks, overlapping)
        const now = new Date();
        const until = new Date();
        until.setDate(until.getDate() + 12 * 7);

        const slotRes = await databases.listDocuments(
          databaseId,
          availabilityCollectionId,
          [
            Query.equal("userId", uid),
            Query.lessThan("startDatetime", until.toISOString()),
            Query.greaterThan("endDatetime", now.toISOString()),
            Query.orderAsc("startDatetime"),
            Query.limit(200),
          ]
        );
        if (!alive) return;
        setSlots(slotRes.documents);
      } catch (e) {
        if (!alive) return;
        // 404 from getDocument => no mapping = not found
        setErr("Profile not found.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [bookingLink]);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
        <nav className="space-x-6 text-sm">
          <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
          <Link to="/login" className="text-gray-300 hover:text-white">Log in</Link>
        </nav>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {loading ? (
          <p>Loading…</p>
        ) : err ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
            <p className="text-gray-400">We couldn’t find <span className="text-white">/{bookingLink}</span>.</p>
          </div>
        ) : (
          <>
            <section className="bg-[#0f172a] p-5 rounded-lg border border-gray-800 mb-6">
              <h2 className="text-2xl font-bold">
                {profile?.displayName || bookingLink}
              </h2>
              {profile?.bio && (
                <p className="text-gray-300 mt-2">{profile.bio}</p>
              )}
            </section>

            <section className="bg-[#0e111a] p-5 rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Available times</h3>

              {slots.length === 0 ? (
                <p className="text-gray-400">No upcoming availability.</p>
              ) : (
                <ul className="space-y-2">
                  {slots.map((s) => (
                    <li
                      key={s.$id}
                      className="flex justify-between items-center bg-black border border-gray-800 rounded px-3 py-2"
                    >
                      <span>{fmtRange(s.startDatetime, s.endDatetime)}</span>
                      {/* placeholder action for booking */}
                      <button className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded">
                        Book
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

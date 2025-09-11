// src/pages/PublicProfile.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { databases } from "../lib/appwrite";
import { Query } from "appwrite";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
// Uses env in prod; hardcoded fallback in dev (replace with your table ID if you want).
const publicProfilesTableId =
  import.meta.env.VITE_PUBLIC_PROFILES_TABLE_ID || "68b36096002de4e6c01f";

// Your existing collection/table IDs
const profileCollectionId = "6885251200346111d297";     // profiles
const availabilityCollectionId = "6886202f003a8d48a2e2"; // availability

export default function PublicProfile() {
  const { bookingLink } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);

  const [slots, setSlots] = useState([]);
  const [viewRange, setViewRange] = useState({ start: null, end: null });

  // Map availability docs to FullCalendar events
  const events = slots.map((s) => ({
    id: s.$id,
    start: s.startDatetime,
    end: s.endDatetime,
    title: "Available",
  }));

  // 1) Resolve booking link -> userId, and load profile
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
        // Look up booking link mapping (doc id = bookingLink)
        const mapping = await databases.getDocument(
          databaseId,
          publicProfilesTableId,
          bookingLink
        );
        if (!alive) return;

        const uid = mapping.userId;
        if (!uid) throw new Error("No user mapped to this link");
        setUserId(uid);

        // Optional: load profile document
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
      } catch {
        if (!alive) return;
        setErr("Profile not found.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bookingLink]);

  // 2) Load slots for the calendar's visible date range (keeps public + dashboard in sync)
  useEffect(() => {
    let alive = true;
    if (!userId || !viewRange.start || !viewRange.end) return;

    (async () => {
      try {
        const startIso = viewRange.start.toISOString();
        const endIso = viewRange.end.toISOString();

        const res = await databases.listDocuments(
          databaseId,
          availabilityCollectionId,
          [
            Query.equal("userId", userId),
            Query.greaterThanEqual("startDatetime", startIso),
            Query.lessThan("startDatetime", endIso),
            Query.orderAsc("startDatetime"),
            Query.limit(400),
          ]
        );

        if (!alive) return;
        setSlots(res.documents);
      } catch (e) {
        if (!alive) return;
        console.error("Public slot load failed:", e);
        setSlots([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, viewRange]);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
        <nav className="space-x-6 text-sm">
          <Link to="/" className="text-gray-300 hover:text-white">
            Home
          </Link>
          <Link to="/login" className="text-gray-300 hover:text-white">
            Log in
          </Link>
        </nav>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <p>Loading…</p>
        ) : err ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
            <p className="text-gray-400">
              We couldn’t find <span className="text-white">/{bookingLink}</span>.
            </p>
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

              <div className="relative w-full overflow-visible">
                <FullCalendar
                  plugins={[timeGridPlugin]}
                  timeZone="local"
                  initialView="timeGridWeek"
                  headerToolbar={{
                    start: "prev,next today",
                    center: "title",
                    end: "timeGridWeek,timeGridDay",
                  }}
                  dayHeaders={true}
                  dayHeaderFormat={{
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }}
                  dayHeaderClassNames={() => [
                    "!bg-gray-800/70",
                    "backdrop-blur",
                    "text-white",
                    "text-[13px]",
                    "font-semibold",
                    "py-1",
                    "border-b",
                    "border-gray-700",
                  ]}
                  allDaySlot={false}
                  slotMinTime="07:00:00"
                  slotMaxTime="22:00:00"
                  slotDuration="00:30:00"
                  slotLabelFormat={{
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }}
                  eventTimeFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }}
                  eventOverlap={false}
                  slotEventOverlap={false}
                  editable={false}
                  selectable={false}
                  height="auto"
                  contentHeight="auto"
                  expandRows
                  eventMinHeight={26}
                  events={events}
                  eventClassNames={() => ["cursor-pointer"]}
                  eventClick={(arg) => {
                    const s = arg.event.start, e = arg.event.end;
                    if (!s || !e) return;
                    const qs = new URLSearchParams({
                      start: s.toISOString(),
                      end: e.toISOString(),
                      provider: userId,
                      link: bookingLink,
                    });
                    navigate(`/book?${qs.toString()}`);
                  }}
                  eventContent={(arg) => {
                    const start = arg.event.start;
                    const end = arg.event.end;
                    if (!start || !end) return null;

                    const startLabel = start.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const endLabel = end.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div className="px-2 py-1 text-xs leading-tight">
                        <div className="font-medium">
                          {startLabel} – {endLabel}
                        </div>
                      </div>
                    );
                  }}
                  // Update viewRange whenever the visible dates change
                  datesSet={(arg) =>
                    setViewRange({ start: arg.start, end: arg.end })
                  }
                />
              </div>

              {slots.length === 0 && (
                <p className="text-gray-400 mt-3">
                  No availability in this view.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

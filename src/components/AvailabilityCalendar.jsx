import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState, useRef } from "react";
import { ID, Query, Permission, Role } from "appwrite";
import { databases } from "../lib/appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const availabilityCollectionId = "6886202f003a8d48a2e2";

// paginate helper
async function listAllDocs(databases, databaseId, collectionId, queries) {
  const all = [];
  let cursor;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      [...queries, Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])]
    );
    all.push(...res.documents);
    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return all;
}

// ✅ build ISO from LOCAL date + time (prevents +1h shift)
function localISOFromYMDAndHM(ymd, hhmm) {
  const [Y, M, D] = ymd.split("-").map(Number);   // "2025-08-30"
  const [h, m] = hhmm.split(":").map(Number);     // "15:00"
  const d = new Date();
  d.setFullYear(Y, M - 1, D);
  d.setHours(h, m, 0, 0);                         // local hours
  return d.toISOString();                         // store as UTC ISO (Z)
}

// ✅ get YYYY-MM-DD from a Date in LOCAL time (avoids day shift)
function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ✅ HH:MM from a Date in LOCAL time
function hhmmLocal(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function AvailabilityCalendar({ userId /*, userTimezone*/ }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editTimes, setEditTimes] = useState({ start: "", end: "" });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(""); // 'add' | 'edit'
  const [slotDate, setSlotDate] = useState("");

  // prevent double submit
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const docs = await listAllDocs(databases, databaseId, availabilityCollectionId, [
        Query.equal("userId", userId),
        Query.orderAsc("startDatetime"),
      ]);

      // Map each doc → event (no dedupe by time; let IDs be unique)
      const evts = docs.map((doc) => ({
        id: doc.$id,
        start: new Date(doc.startDatetime),
        end: new Date(doc.endDatetime),
      }));
      setEvents(evts);
    } catch (err) {
      console.error("Error loading availability:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSelect = (info) => {
    // Use LOCAL date & time from Date objects (not slicing ISO)
    const date = ymdLocal(info.start);
    const startHHMM = hhmmLocal(info.start);
    const endHHMM = hhmmLocal(info.end);
    setSlotDate(date);
    setEditTimes({ start: startHHMM, end: endHHMM });
    setModalMode("add");
    setShowModal(true);
  };

  const handleEventClick = (clickInfo) => {
    const startDate = clickInfo.event.start;
    const endDate = clickInfo.event.end;
    const date = ymdLocal(startDate); // local date (prevents off-by-one)
    setSelectedEvent(clickInfo.event);
    setSlotDate(date);
    setEditTimes({ start: hhmmLocal(startDate), end: hhmmLocal(endDate) });
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    // basic validation
    if (!editTimes.start || !editTimes.end) {
      alert("Please enter both start and end times.");
      return;
    }
    const startISO = localISOFromYMDAndHM(slotDate, editTimes.start);
    const endISO = localISOFromYMDAndHM(slotDate, editTimes.end);
    if (new Date(endISO) <= new Date(startISO)) {
      alert("End time must be after start time.");
      return;
    }

    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    try {
      if (modalMode === "add") {
        // Optional dup check (same exact start/end in current view)
        const dup = events.some(
          (e) => e.start.getTime() === new Date(startISO).getTime() && e.end.getTime() === new Date(endISO).getTime()
        );
        if (!dup) {
          await databases.createDocument(
            databaseId,
            availabilityCollectionId,
            ID.unique(),
            {
              userId,
              startDatetime: startISO,
              endDatetime: endISO,
            },
            [
              // ✅ make custom-added slots publicly readable like generated ones
              Permission.read(Role.any()),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId)),
            ]
          );
        }
      } else if (modalMode === "edit" && selectedEvent) {
        await databases.updateDocument(databaseId, availabilityCollectionId, selectedEvent.id, {
          startDatetime: startISO,
          endDatetime: endISO,
        });
      }
      await fetchAvailability();
      setShowModal(false);
    } catch (err) {
      console.error("Error saving slot:", err);
      alert("Error saving slot.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      if (selectedEvent) {
        await databases.deleteDocument(databaseId, availabilityCollectionId, selectedEvent.id);
      }
      await fetchAvailability();
      setShowModal(false);
    } catch (err) {
      console.error("Error deleting slot:", err);
      alert("Error deleting slot.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-black text-white font-mono rounded-xl border border-gray-800 shadow-md">
      <h2 className="text-xl font-semibold mb-4">Set Your Available Time Slots Below</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="relative w-full overflow-visible">
          <FullCalendar
            timeZone="local"  // keep calendar in local time
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ start: "prev,next today", center: "title", end: "timeGridWeek,timeGridDay" }}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            slotLabelFormat={{ hour: "numeric", minute: "2-digit", hour12: true }}
            slotLabelClassNames={() => ["text-gray-400", "text-[11px]", "font-mono"]}
            dayHeaderFormat={{ weekday: "short", day: "numeric" }}
            selectable
            nowIndicator
            allDaySlot={false}
            editable={false}
            events={events}
            select={handleSelect}
            eventClick={handleEventClick}
            height="auto"
            contentHeight="auto"
            expandRows
            eventOverlap={false}
            slotEventOverlap={false}
            eventMinHeight={26}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: true }}
            eventContent={(arg) => {
              const start = arg.event.start;
              const end = arg.event.end;
              if (!start || !end) return null;

              const startLabel = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const endLabel = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <div className="sd-event" title={`${startLabel} – ${endLabel}`}>
                  <div className="sd-event-time">{startLabel} – {endLabel}</div>
                </div>
              );
            }}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-indigo-500/80 border border-indigo-400" />
          Available
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-500/80 border border-green-400" />
          Booked
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-500/80 border border-amber-400" />
          Pending
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 capitalize">
              {modalMode === "add" ? "Add Slot" : "Edit Slot"}
            </h3>

            <div className="space-y-3">
              <label className="block text-sm">
                Start Time:
                <input
                  type="time"
                  className="block w-full mt-1 bg-black border border-gray-700 px-3 py-2 rounded"
                  value={editTimes.start}
                  onChange={(e) => setEditTimes({ ...editTimes, start: e.target.value })}
                />
              </label>

              <label className="block text-sm">
                End Time:
                <input
                  type="time"
                  className="block w-full mt-1 bg-black border border-gray-700 px-3 py-2 rounded"
                  value={editTimes.end}
                  onChange={(e) => setEditTimes({ ...editTimes, end: e.target.value })}
                />
              </label>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              {modalMode === "edit" && (
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="text-sm text-red-400 hover:text-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="text-sm text-gray-400 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-sm px-4 py-2 rounded text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

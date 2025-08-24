import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";
import { ID, Query } from "appwrite";
import { databases } from "../lib/appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const availabilityCollectionId = "6886202f003a8d48a2e2";

export default function AvailabilityCalendar({ userId, userTimezone }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editTimes, setEditTimes] = useState({ start: "", end: "" });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(""); // 'add' | 'edit'
  const [slotDate, setSlotDate] = useState("");

  const fetchAvailability = async () => {
    try {
      const res = await databases.listDocuments(databaseId, availabilityCollectionId, [
        Query.equal("userId", userId),
        Query.orderAsc("startDatetime"),
        Query.limit(100), // adjust if you expect >100, or paginate in a loop
      ]);

      // De-duplicate records with identical start+end (common if slots were generated twice)
      const byKey = new Map();
      for (const doc of res.documents) {
        const startISO = doc.startDatetime;
        const endISO = doc.endDatetime;
        const key = `${startISO}__${endISO}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: doc.$id,
            title: `${new Date(startISO).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} - ${new Date(endISO).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            start: startISO,
            end: endISO,
          });
        }
      }

      setEvents(Array.from(byKey.values()));
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
    const date = info.startStr.slice(0, 10);
    const startHHMM = info.startStr.slice(11, 16);
    const endHHMM = info.endStr.slice(11, 16);

    setSlotDate(date);
    setEditTimes({ start: startHHMM, end: endHHMM });
    setModalMode("add");
    setShowModal(true);
  };

  const handleEventClick = (clickInfo) => {
    const startDate = clickInfo.event.start;
    const endDate = clickInfo.event.end;

    const toHHMM = (d) => (d ? d.toTimeString().slice(0, 5) : "");
    const date = startDate.toISOString().slice(0, 10);

    setSelectedEvent(clickInfo.event);
    setSlotDate(date);
    setEditTimes({ start: toHHMM(startDate), end: toHHMM(endDate) });
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    // Save as local time without forcing 'Z' so it shows where the user expects
    const start = `${slotDate}T${editTimes.start}:00`;
    const end = `${slotDate}T${editTimes.end}:00`;

    try {
      if (modalMode === "add") {
        // Optional: prevent adding duplicate slot times
        const dupKey = `${start}__${end}`;
        const already = events.some((e) => `${e.start}__${e.end}` === dupKey);
        if (!already) {
          await databases.createDocument(databaseId, availabilityCollectionId, ID.unique(), {
            userId,
            startDatetime: start,
            endDatetime: end,
          });
        }
      } else if (modalMode === "edit" && selectedEvent) {
        await databases.updateDocument(databaseId, availabilityCollectionId, selectedEvent.id, {
          startDatetime: start,
          endDatetime: end,
        });
      }

      await fetchAvailability();
      setShowModal(false);
    } catch (err) {
      console.error("Error saving slot:", err);
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedEvent) {
        await databases.deleteDocument(databaseId, availabilityCollectionId, selectedEvent.id);
      }
      await fetchAvailability();
      setShowModal(false);
    } catch (err) {
      console.error("Error deleting slot:", err);
    }
  };

  return (
    <div className="p-6 bg-black text-white font-mono rounded-xl border border-gray-800 shadow-md">
      <h2 className="text-xl font-semibold mb-4">Set Your Available Time Slots Below</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="h-[900px]"> {/* give the grid some vertical room */}
          <FullCalendar
            timeZone={userTimezone || "local"}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: "timeGridWeek,timeGridDay",
            }}
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
            height="100%"
            expandRows
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: true }}
            eventContent={(arg) => {
  const [startLabel, endLabel] = arg.event.title.split(" - ");
  return (
    <div
      className="sd-event bg-indigo-600 text-white rounded shadow px-2 py-1 text-[11px] leading-tight text-center"
      title={`${startLabel} – ${endLabel}`}
    >
      <div className="font-semibold">{startLabel}</div>
      <div className="opacity-90">{endLabel}</div>
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

      {/* Modal */}
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
                <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-500">
                  Delete
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-sm px-4 py-2 rounded text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

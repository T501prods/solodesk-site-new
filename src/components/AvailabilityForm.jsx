import { useRef, useState } from "react";
import { databases } from "../lib/appwrite";
import { ID, Permission, Role } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const availabilityCollectionId = "6886202f003a8d48a2e2";

// build ISO from LOCAL date + time (prevents +1h shift)
function localISOFromYMDAndHM(ymd, hhmm) {
  const [Y, M, D] = ymd.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setFullYear(Y, M - 1, D);
  d.setHours(h, m, 0, 0); // local hours
  return d.toISOString(); // stored as UTC ISO (Z)
}

export default function AvailabilityForm({ userId }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!date || !startTime || !endTime) {
      setMessage("Please complete all fields.");
      return;
    }

    const startISO = localISOFromYMDAndHM(date, startTime);
    const endISO = localISOFromYMDAndHM(date, endTime);

    // Simple validation: end must be after start
    if (new Date(endISO) <= new Date(startISO)) {
      setMessage("End time must be after start time.");
      return;
    }

    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    try {
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
          // Public read so slots show on public booking page
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );
      setMessage("Slot added successfully ✅");
      setDate("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      console.error("Error adding slot:", err);
      setMessage("Failed to add slot.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-gray-900 p-6 border border-gray-700 rounded-lg mt-6">
      <h3 className="text-lg font-semibold mb-4 text-white">Add a Custom Slot</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
            required
          />
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2 rounded transition text-sm"
          >
            {isSaving ? "Adding…" : "Add Slot"}
          </button>
        </div>
      </form>
      {message && <p className="text-sm mt-3 {message.includes('✅') ? 'text-green-400' : 'text-amber-400'}">{message}</p>}
    </section>
  );
}

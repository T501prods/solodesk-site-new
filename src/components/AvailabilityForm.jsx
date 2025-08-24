import { useState } from "react";
import { databases } from "../lib/appwrite";
import { ID } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const availabilityCollectionId = "6886202f003a8d48a2e2";

export default function AvailabilityForm({ userId }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!date || !startTime || !endTime) {
      setMessage("Please complete all fields.");
      return;
    }

    const startISO = `${date}T${startTime}:00Z`;
    const endISO = `${date}T${endTime}:00Z`;

    // Simple validation: end must be after start
    if (new Date(endISO) <= new Date(startISO)) {
      setMessage("End time must be after start time.");
      return;
    }

    try {
      await databases.createDocument(databaseId, availabilityCollectionId, ID.unique(), {
        userId,
        startDatetime: startISO,
        endDatetime: endISO,
      });
      setMessage("Slot added successfully ✅");
      setDate("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      console.error("Error adding slot:", err);
      setMessage("Failed to add slot.");
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
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded transition text-sm"
          >
            Add Slot
          </button>
        </div>
      </form>
      {message && <p className="text-sm text-green-400 mt-3">{message}</p>}
    </section>
  );
}

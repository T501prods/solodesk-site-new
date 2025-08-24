import { useEffect, useState } from "react";
import { databases } from "../lib/appwrite";
import { ID, Query, Permission, Role } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const settingsCollectionId = "6886516400065cd4ceba";    // availability_settings
const availabilityCollectionId = "6886202f003a8d48a2e2"; // availability

// Small delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Delete availability slots in batches to avoid rate limits
const deleteExistingAvailability = async (userId) => {
  try {
    let totalDeleted = 0;
    let cursor = undefined;

    while (true) {
      const res = await databases.listDocuments(databaseId, availabilityCollectionId, [
        Query.equal("userId", userId),
        Query.limit(20), // batch 20 at a time
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ]);

      if (res.documents.length === 0) break;

      for (const doc of res.documents) {
        let success = false;
        while (!success) {
          try {
            await databases.deleteDocument(databaseId, availabilityCollectionId, doc.$id);
            totalDeleted++;
            success = true;
          } catch (err) {
            if (err.message.includes("Rate limit")) {
              await sleep(300); // wait a bit before retry
            } else {
              console.error("Delete error:", err);
              success = true; // skip if other error
            }
          }
        }
        await sleep(50); // small delay between deletes
      }

      cursor = res.documents[res.documents.length - 1].$id;
    }

    console.log(`Deleted ${totalDeleted} old slots.`);
  } catch (err) {
    console.error("Error deleting existing availability:", err);
  }
};

// Generate slots in batches with throttling
const generateAvailabilitySlots = async (settings, userId) => {
  await deleteExistingAvailability(userId);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + (settings.bookingWindowWeeks || 4) * 7);

  const slotLengthMs = (settings.slotLengthMinutes || 30) * 60 * 1000;
  const newSlots = [];

  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isWeekday = dow >= 1 && dow <= 5;

    let start, end;
    if (isWeekday && settings.weekdayStart && settings.weekdayEnd) {
      start = settings.weekdayStart;
      end = settings.weekdayEnd;
    }
    if (isWeekend && settings.allowWeekends && settings.weekendStart && settings.weekendEnd) {
      start = settings.weekendStart;
      end = settings.weekendEnd;
    }
    if (!start || !end) continue;

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const startTime = new Date(day);
    startTime.setHours(sh, sm, 0, 0);

    const endTime = new Date(day);
    endTime.setHours(eh, em, 0, 0);

    let slotTime = new Date(startTime);
    while (slotTime < endTime) {
      const slotEnd = new Date(slotTime.getTime() + slotLengthMs);
      if (slotEnd > endTime) break;

      newSlots.push({
        userId,
        startDatetime: slotTime.toISOString(),
        endDatetime: slotEnd.toISOString(),
      });

      slotTime = slotEnd;
    }
  }

  console.log("Saving", newSlots.length, "slots...");

  // Save in batches of 10 with throttling
  const batchSize = 10;
  for (let i = 0; i < newSlots.length; i += batchSize) {
    const batch = newSlots.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (slot) => {
        let success = false;
        while (!success) {
          try {
            await databases.createDocument(
              databaseId,
              availabilityCollectionId,
              ID.unique(),
              slot,
              [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
              ]
            );
            success = true;
          } catch (err) {
            if (err.message.includes("Rate limit")) {
              await sleep(300);
            } else {
              console.error("Error creating slot:", err);
              success = true;
            }
          }
        }
      })
    );
    await sleep(100); // small delay between batches
  }

  console.log("All slots saved successfully.");
};

export default function AvailabilitySettingsForm({ userId }) {
  const [form, setForm] = useState({
    weekdayStart: "09:00",
    weekdayEnd: "17:00",
    allowWeekends: false,
    weekendStart: "",
    weekendEnd: "",
    bookingWindowWeeks: 4,
    slotLengthMinutes: 30,
  });

  const [documentId, setDocumentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await databases.listDocuments(databaseId, settingsCollectionId, [
          Query.equal("userId", userId),
          Query.limit(1),
        ]);

        if (res.documents.length > 0) {
          const doc = res.documents[0];
          setDocumentId(doc.$id);
          setForm({
            weekdayStart: doc.weekdayStart ?? "09:00",
            weekdayEnd: doc.weekdayEnd ?? "17:00",
            allowWeekends: !!doc.allowWeekends,
            weekendStart: doc.weekendStart ?? "",
            weekendEnd: doc.weekendEnd ?? "",
            bookingWindowWeeks: doc.bookingWindowWeeks ?? 4,
            slotLengthMinutes: doc.slotLengthMinutes ?? 30,
          });
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        setMessage("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchSettings();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Saving...");

    try {
      const data = { userId, ...form };

      if (documentId) {
        await databases.updateDocument(databaseId, settingsCollectionId, documentId, data);
      } else {
        const newDoc = await databases.createDocument(
          databaseId,
          settingsCollectionId,
          ID.unique(),
          data,
          [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
          ]
        );
        setDocumentId(newDoc.$id);
      }

      await generateAvailabilitySlots(data, userId);
      setMessage("Settings saved! Slots updated.");
    } catch (err) {
      console.error("Error saving availability:", err);
      setMessage("Failed to save settings.");
    }
  };

  if (loading) return <p className="text-white p-4">Loading settings...</p>;

  return (
    <div className="bg-[#0e111a] border border-gray-800 rounded-lg p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-4">Availability Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-gray-400 mb-1">Weekday Start</span>
            <input
              type="time"
              value={form.weekdayStart}
              onChange={(e) => setForm({ ...form, weekdayStart: e.target.value })}
              required
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            />
          </label>
          <label className="block">
            <span className="block text-gray-400 mb-1">Weekday End</span>
            <input
              type="time"
              value={form.weekdayEnd}
              onChange={(e) => setForm({ ...form, weekdayEnd: e.target.value })}
              required
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            />
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.allowWeekends}
            onChange={(e) => setForm({ ...form, allowWeekends: e.target.checked })}
            className="accent-indigo-600"
          />
          <span className="text-gray-300">Allow Weekend Bookings</span>
        </label>

        {form.allowWeekends && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-gray-400 mb-1">Weekend Start</span>
              <input
                type="time"
                value={form.weekendStart}
                onChange={(e) => setForm({ ...form, weekendStart: e.target.value })}
                className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
              />
            </label>
            <label className="block">
              <span className="block text-gray-400 mb-1">Weekend End</span>
              <input
                type="time"
                value={form.weekendEnd}
                onChange={(e) => setForm({ ...form, weekendEnd: e.target.value })}
                className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-gray-400 mb-1">Booking Window (weeks)</span>
            <input
              type="number"
              value={form.bookingWindowWeeks}
              min={1}
              max={52}
              onChange={(e) => setForm({ ...form, bookingWindowWeeks: parseInt(e.target.value || "1", 10) })}
              required
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            />
          </label>
          <label className="block">
            <span className="block text-gray-400 mb-1">Slot Length (minutes)</span>
            <input
              type="number"
              value={form.slotLengthMinutes}
              min={5}
              max={120}
              step={5}
              onChange={(e) => setForm({ ...form, slotLengthMinutes: parseInt(e.target.value || "5", 10) })}
              required
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded"
          >
            Save Settings
          </button>
          {message && <span className="text-gray-300">{message}</span>}
        </div>
      </form>
    </div>
  );
}

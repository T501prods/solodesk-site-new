// src/components/AvailabilitySettingsForm.jsx
import { useEffect, useState, useRef } from "react";
import { databases, account } from "../lib/appwrite";
import { ID, Query, Permission, Role } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const settingsCollectionId = "6886516400065cd4ceba";    // availability_settings
const availabilityCollectionId = "6886202f003a8d48a2e2"; // availability

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function with429Retry(fn, tries = 5, base = 200) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || "");
      const is429 = err?.code === 429 || msg.toLowerCase().includes("rate limit");
      if (!is429 || attempt >= tries - 1) throw err;
      await sleep(base * Math.pow(1.8, attempt));
      attempt++;
    }
  }
}

// ---------- DELETION: keep looping until zero -------------
async function hardDeleteAllUserSlots(userId) {
  let total = 0;
  // loop pages until empty
  for (;;) {
    const page = await with429Retry(() =>
      databases.listDocuments(databaseId, availabilityCollectionId, [
        Query.equal("userId", userId),
        Query.orderAsc("$id"),
        Query.limit(100),
      ])
    );
    if (page.documents.length === 0) break;

    let ops = 0;
    for (const doc of page.documents) {
      await with429Retry(() =>
        databases.deleteDocument(databaseId, availabilityCollectionId, doc.$id)
      );
      total++;
      ops++;
      if (ops % 8 === 0) {
        await sleep(1200);
      } else {
        await sleep(400);
      }
    }
  }
  console.log(`[availability] deleted ${total} existing slot(s)`);
  return total;
}

// ---------- CADENCE HELPERS -------------------------------
function buildAnchors({ cadence, everyMinutes }) {
  // Returns an array of minutes within an hour that are allowed start points.
  if (cadence === "hour") return [0];
  const n = Math.max(1, Number(everyMinutes || 30));
  const out = [];
  for (let m = 0; m < 60; m += n) out.push(m);
  return out;
}

function nextAlignedStart(from, anchors) {
  // Round "from" up to the next anchor (minute-of-hour) boundary
  const d = new Date(from);
  const min = d.getMinutes();
  const cand = anchors.find((m) => m >= min);
  if (cand !== undefined) {
    d.setMinutes(cand, 0, 0);
  } else {
    // jump to next hour, first anchor
    d.setHours(d.getHours() + 1, anchors[0], 0, 0);
  }
  if (d < from) d.setMinutes(from.getMinutes(), 0, 0); // safety
  return d;
}

// ---------- GENERATE --------------------------------------
async function generateSlots(settings, userId) {
  await hardDeleteAllUserSlots(userId);

  const {
    weekdayStart, weekdayEnd,
    allowWeekends, weekendStart, weekendEnd,
    bookingWindowWeeks, slotLengthMinutes,
    cadence = "hour",      // 'hour' | 'every'
    everyMinutes = 60,     // used when cadence==='every'
    gapMinutes = 0,        // optional gap after each slot
    alignToCadence = true, // if true, start-times snap to anchors
  } = settings;

  const slotMs = Math.max(5, Number(slotLengthMinutes || 30)) * 60 * 1000;
  const gapMs  = Math.max(0, Number(gapMinutes || 0)) * 60 * 1000;
  const weeks  = Math.max(1, Number(bookingWindowWeeks || 4));

  const anchors = buildAnchors({ cadence, everyMinutes: Number(everyMinutes) });

  const startDate = new Date(); startDate.setHours(0,0,0,0);
  const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + weeks * 7);

  const toDayTime = (day, hhmm) => {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const payloads = [];

  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dow = day.getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    const isWeekend = dow === 0 || dow === 6;

    let dayStart, dayEnd;
    if (isWeekday && weekdayStart && weekdayEnd) {
      dayStart = toDayTime(day, weekdayStart);
      dayEnd   = toDayTime(day, weekdayEnd);
    } else if (isWeekend && allowWeekends && weekendStart && weekendEnd) {
      dayStart = toDayTime(day, weekendStart);
      dayEnd   = toDayTime(day, weekendEnd);
    } else {
      continue;
    }

    let cursor = new Date(dayStart);
    if (alignToCadence) cursor = nextAlignedStart(cursor, anchors);

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + slotMs);
      if (slotEnd > dayEnd) break; // don't overflow past dayEnd

      payloads.push({
        userId,
        startDatetime: cursor.toISOString(),
        endDatetime: slotEnd.toISOString(),
      });

      // move to next start
      const nextFrom = new Date(slotEnd.getTime() + gapMs);
      cursor = alignToCadence ? nextAlignedStart(nextFrom, anchors) : nextFrom;
    }
  }

  console.log(`[availability] creating ${payloads.length} slot(s)`, {
    slotLengthMinutes, gapMinutes, cadence, everyMinutes, alignToCadence
  });

  let ops = 0;
  for (const body of payloads) {
    await with429Retry(() =>
      databases.createDocument(
        databaseId,
        availabilityCollectionId,
        ID.unique(),
        body,
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      )
    );
    ops++;
    if (ops % 8 === 0) {
      await sleep(1200);
    } else {
      await sleep(400);
    }
  }
  console.log("[availability] generation done");
}

// ---------- COMPONENT -------------------------------------
export default function AvailabilitySettingsForm({ userId }) {
  const [form, setForm] = useState({
    weekdayStart: "09:00",
    weekdayEnd: "17:00",
    allowWeekends: false,
    weekendStart: "",
    weekendEnd: "",
    bookingWindowWeeks: 4,
    slotLengthMinutes: 30,

    // NEW small “Advanced” controls:
    cadence: "hour",        // 'hour' | 'every'
    everyMinutes: 60,       // only when cadence === 'every'
    gapMinutes: 0,          // optional gap after each slot
    alignToCadence: true,   // snap to hour or cadence
  });

  const [documentId, setDocumentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  // NEW: in-flight guard
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await databases.listDocuments(databaseId, settingsCollectionId, [
          Query.equal("userId", userId),
          Query.limit(1),
        ]);
        if (res.documents.length) {
          const d = res.documents[0];
          setDocumentId(d.$id);
          setForm((f) => ({
            ...f,
            weekdayStart: d.weekdayStart ?? f.weekdayStart,
            weekdayEnd: d.weekdayEnd ?? f.weekdayEnd,
            allowWeekends: !!d.allowWeekends,
            weekendStart: d.weekendStart ?? "",
            weekendEnd: d.weekendEnd ?? "",
            bookingWindowWeeks: Number(d.bookingWindowWeeks ?? f.bookingWindowWeeks),
            slotLengthMinutes: Number(d.slotLengthMinutes ?? f.slotLengthMinutes),

            cadence: d.cadence ?? f.cadence,
            everyMinutes: Number(d.everyMinutes ?? f.everyMinutes),
            gapMinutes: Number(d.gapMinutes ?? f.gapMinutes),
            alignToCadence: d.alignToCadence ?? f.alignToCadence,
          }));
          setLastSaved({
            weekdayStart: d.weekdayStart,
            weekdayEnd: d.weekdayEnd,
            allowWeekends: !!d.allowWeekends,
            weekendStart: d.weekendStart,
            weekendEnd: d.weekendEnd,
            bookingWindowWeeks: Number(d.bookingWindowWeeks),
            slotLengthMinutes: Number(d.slotLengthMinutes),
          });
        }
      } catch (e) {
        console.error("Load settings failed", e);
        setMessage("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // prevent overlapping/duplicate saves
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setMessage("Saving… (may take a moment)");

    try {
      // Only send schema-approved fields
      const data = {
        userId,
        weekdayStart: form.weekdayStart,
        weekdayEnd: form.weekdayEnd,
        allowWeekends: form.allowWeekends,
        weekendStart: form.weekendStart,
        weekendEnd: form.weekendEnd,
        bookingWindowWeeks: form.bookingWindowWeeks,
        slotLengthMinutes: form.slotLengthMinutes,
        // ❌ omit cadence, everyMinutes, gapMinutes, alignToCadence
      };

      if (documentId) {
        await databases.updateDocument(databaseId, settingsCollectionId, documentId, data);
      } else {
        const created = await databases.createDocument(
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
        setDocumentId(created.$id);
      }

      // Decide whether to regenerate slots
const current = {
  weekdayStart: form.weekdayStart,
  weekdayEnd: form.weekdayEnd,
  allowWeekends: form.allowWeekends,
  weekendStart: form.weekendStart,
  weekendEnd: form.weekendEnd,
  bookingWindowWeeks: form.bookingWindowWeeks,
  slotLengthMinutes: form.slotLengthMinutes,
};

// If no previous save, treat as changed
const changed =
  !lastSaved || JSON.stringify(current) !== JSON.stringify(lastSaved);

if (changed) {
  await generateSlots(form, userId);
  setLastSaved(current);
  setMessage("Settings saved! Slots regenerated.");
} else {
  setMessage("Settings saved (no changes).");
}

    } catch (e) {
      console.error("Error saving availability:", e);
      setMessage("Failed to save settings.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
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
              onChange={(e) =>
                setForm({ ...form, bookingWindowWeeks: parseInt(e.target.value || "1", 10) })
              }
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
              max={180}
              step={5}
              onChange={(e) =>
                setForm({ ...form, slotLengthMinutes: parseInt(e.target.value || "5", 10) })
              }
              required
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            />
          </label>
        </div>

        {/* Small "Advanced" row */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-gray-400 mb-1">Slot Cadence</span>
            <select
              value={form.cadence}
              onChange={(e) => setForm({ ...form, cadence: e.target.value })}
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            >
              <option value="hour">On the hour</option>
              <option value="every">Every N minutes</option>
            </select>
          </label>

          {form.cadence === "every" ? (
            <label className="block">
              <span className="block text-gray-400 mb-1">Every (minutes)</span>
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={form.everyMinutes}
                onChange={(e) =>
                  setForm({ ...form, everyMinutes: parseInt(e.target.value || "5", 10) })
                }
                className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
              />
            </label>
          ) : (
            <label className="block">
              <span className="block text-gray-400 mb-1">Align to cadence</span>
              <select
                value={form.alignToCadence ? "yes" : "no"}
                onChange={(e) => setForm({ ...form, alignToCadence: e.target.value === "yes" })}
                className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
              >
                <option value="yes">Yes (snap to hour)</option>
                <option value="no">No (continuous)</option>
              </select>
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-gray-400 mb-1">Gap after each slot (mins)</span>
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={form.gapMinutes}
              onChange={(e) =>
                setForm({ ...form, gapMinutes: parseInt(e.target.value || "0", 10) })
              }
              className="w-full bg-black border border-gray-700 px-3 py-2 rounded"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
          >
            {isSaving ? "Saving…" : "Save Settings"}
          </button>
          {message && <span className="text-gray-300">{message}</span>}
        </div>
      </form>
    </div>
  );
}

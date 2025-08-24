import { useEffect, useState } from "react";
import { Query } from "appwrite";
import { databases } from "../lib/appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = "6886202f003a8d48a2e2";

export default function UserAvailabilityList({ userId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await databases.listDocuments(databaseId, collectionId, [
          Query.equal("userId", userId),
          Query.orderAsc("startDatetime"),
        ]);
        setSlots(res.documents);
      } catch (err) {
        console.error("Error fetching availability:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchAvailability();
  }, [userId]);

  if (loading) return <p className="text-white p-4">Loading availability...</p>;

  return (
    <div className="bg-[#0e111a] border border-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Your Availability Slots</h3>
      {slots.length === 0 ? (
        <p className="text-gray-400 text-sm">No availability added yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {slots.map((slot) => {
            const start = slot.startDatetime ? new Date(slot.startDatetime) : null;
            const end = slot.endDatetime ? new Date(slot.endDatetime) : null;

            return (
              <li key={slot.$id} className="text-gray-300">
                {start && end
                  ? `${start.toLocaleDateString()} — ${start.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} to ${end.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Invalid date/time"}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

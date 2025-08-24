import { useState, useEffect } from "react";
import { databases, account } from "../lib/appwrite";
import { ID, Permission, Role } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const bookingsCollectionId = "68852d7d0009e66fa8bd"; // bookings

export default function BookingForm({ userId }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ensure we have a session for creating docs (anonymous is fine for public)
  useEffect(() => {
    account
      .get()
      .catch(() => account.createAnonymousSession().catch((err) => console.error("Anonymous session failed:", err)));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setSubmitting(true);

    try {
      await databases.createDocument(
        databaseId,
        bookingsCollectionId,
        ID.unique(),
        {
          userId,   // owner of this booking (profile owner)
          name,
          email,
          message,
        },
        [
          // Let the profile owner view/update/delete this booking
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );

      setStatus("Booking submitted!");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      console.error("Booking failed:", error);
      setStatus("Failed to submit booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Book a session</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-black border border-gray-700 px-3 py-2 rounded text-white"
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black border border-gray-700 px-3 py-2 rounded text-white"
        />
        <textarea
          placeholder="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-black border border-gray-700 px-3 py-2 rounded text-white min-h-[100px] resize-y"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2 rounded text-sm"
        >
          {submitting ? "Submitting…" : "Book"}
        </button>
      </form>
      {status && <p className="text-sm mt-3 {status.includes('Failed') ? 'text-red-400' : 'text-green-400'}">{status}</p>}
    </div>
  );
}

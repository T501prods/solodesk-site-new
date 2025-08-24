import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Query } from "appwrite";
import { databases } from "../lib/appwrite";
import BookingForm from "../pages/BookingForm";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const profileCollectionId = "6885251200346111d297"; // profiles

export default function PublicProfile() {
  const { bookingLink } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await databases.listDocuments(databaseId, profileCollectionId, [
          Query.equal("bookingLink", bookingLink),
          Query.limit(1),
        ]);

        if (!res.documents.length) {
          setError("Profile not found.");
        } else {
          setProfile(res.documents[0]);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [bookingLink]);

  if (loading) return <p className="text-white p-6">Loading profile...</p>;
  if (error) return <p className="text-red-400 p-6">{error}</p>;

  const theme = profile?.colorTheme || "indigo";

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Profile header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {profile.businessName || profile.name || "Booking Page"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {profile.bio || "Book a session below."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Theme</span>
                <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 text-xs">
                  {theme}
                </span>
              </div>
            </div>

            <div className="text-gray-500 text-xs mt-3">
              Link: <span className="text-gray-400">solodesk.co.uk/{profile.bookingLink}</span>
            </div>
          </div>

          {/* Booking form */}
          <div className="bg-[#0e111a] border border-gray-800 rounded-xl p-6">
            <BookingForm userId={profile.userId} />
          </div>
        </div>
      </main>
    </div>
  );
}

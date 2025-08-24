import { useState, useEffect } from "react";
import { ID, Query } from "appwrite";
import { databases } from "../lib/appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = "6885251200346111d297"; // profiles

export default function ProfileForm({ userId }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    businessName: "",
    timezone: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await databases.listDocuments(databaseId, collectionId, [
          Query.equal("userId", userId),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) {
          const doc = res.documents[0];
          setProfile(doc);
          setForm({
            name: doc.name || "",
            bio: doc.bio || "",
            businessName: doc.businessName || "",
            timezone: doc.timezone || "",
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      let res;
      if (profile) {
        res = await databases.updateDocument(databaseId, collectionId, profile.$id, {
          ...form,
        });
        setMessage("Profile updated!");
      } else {
        res = await databases.createDocument(databaseId, collectionId, ID.unique(), {
          userId,
          ...form,
        });
        setProfile(res);
        setMessage("Profile created!");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setMessage("Failed to save profile.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-[#0e111a] border border-gray-800 p-6 rounded-lg max-w-xl"
    >
      <h3 className="text-lg font-semibold mb-2">Your Profile Info</h3>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Full Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded bg-black text-white border border-gray-700 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Business Name</label>
        <input
          type="text"
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded bg-black text-white border border-gray-700 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Timezone</label>
        <select
          name="timezone"
          value={form.timezone}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded bg-black text-white border border-gray-700 text-sm"
        >
          <option value="">Select your timezone</option>
          <option value="Europe/London">Europe/London</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="Australia/Sydney">Australia/Sydney</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Bio</label>
        <textarea
          name="bio"
          value={form.bio}
          onChange={handleChange}
          rows="3"
          className="w-full px-3 py-2 rounded bg-black text-white border border-gray-700 text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm"
        >
          {profile ? "Update Profile" : "Save Profile"}
        </button>
        {message && <span className="text-green-400 text-sm">{message}</span>}
      </div>
    </form>
  );
}

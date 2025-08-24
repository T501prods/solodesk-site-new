import { useEffect, useState } from "react";
import { account } from "../lib/appwrite";  // ← use the shared instance
import ProfileForm from "./ProfileForm";

export default function Profile() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await account.get();
        setUserId(user.$id);
      } catch (err) {
        console.error("Not logged in:", err);
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  if (loading) return <p className="text-white p-4">Loading...</p>;
  if (!userId) return <p className="text-white p-4">You must be logged in to create a profile.</p>;

  return <ProfileForm userId={userId} />;
}

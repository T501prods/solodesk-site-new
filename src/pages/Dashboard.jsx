import { useEffect, useState } from "react";
import { Query, Permission, Role } from "appwrite";
import { Link, useNavigate } from "react-router-dom";
import { account, databases } from "../lib/appwrite";
import ProfileForm from "../pages/ProfileForm";
import AvailabilityForm from "../components/AvailabilityForm";
import AvailabilitySettingsForm from "../components/AvailabilitySettingsForm";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

import { AnimatePresence, motion } from "framer-motion";

// Reusable collapsible wrapper
function CollapsibleSection({ show, children, className = "" }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.section
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          <div className="p-4">{children}</div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const profileCollectionId = "6885251200346111d297"; // profiles
const publicProfilesTableId = import.meta.env.VITE_PUBLIC_PROFILES_TABLE_ID;

export default function Dashboard() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customLink, setCustomLink] = useState("");
  const [originalLink, setOriginalLink] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userTimezone, setUserTimezone] = useState("local");

  // one source of truth for which panel is open
  // values: "profile" | "availability" | "custom" | "link" | null
  const [openPanel, setOpenPanel] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const user = await account.get();
        setUserId(user.$id);
        setCustomLink(user.prefs?.bookingLink || "");
        setOriginalLink(user.prefs?.bookingLink || "");

        const res = await databases.listDocuments(databaseId, profileCollectionId, [
          Query.equal("userId", user.$id),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) {
          const tz = res.documents[0].timezone;
          if (tz && typeof tz === "string") setUserTimezone(tz);
        }
      } catch (err) {
        console.error("Not logged in:", err);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const togglePanel = (panel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const handleSaveCustomLink = async () => {
  const newLink = (customLink || "").trim();
  if (newLink.length < 3) {
    alert("Link must be at least 3 characters");
    return;
  }
  if (!publicProfilesTableId) {
    alert("Public profiles table ID is missing. Set VITE_PUBLIC_PROFILES_TABLE_ID.");
    return;
  }

  try {
    // 1) Is this link already used?
    let existing = null;
    try {
      existing = await databases.getDocument(databaseId, publicProfilesTableId, newLink);
    } catch (err) {
      if (err?.code !== 404) throw err; // 404 means not taken
    }

    // If exists and not ours -> taken
    if (existing && existing.user_id !== userId) {
      alert("That link is already taken. Please choose another.");
      return;
    }

    // 2) If renaming, clean up the previous doc (if it was ours)
    if (originalLink && originalLink !== newLink) {
      try {
        const oldDoc = await databases.getDocument(databaseId, publicProfilesTableId, originalLink);
        if (oldDoc?.user_id === userId) {
          await databases.deleteDocument(databaseId, publicProfilesTableId, originalLink);
        }
      } catch (err) {
        if (err?.code !== 404) console.warn("Old link cleanup:", err);
      }
    }

    // 3) Upsert the public mapping (doc ID = booking link). Only send the columns your table has.
    if (!existing) {
      await databases.createDocument(
        databaseId,
        publicProfilesTableId,
        newLink,                 // document ID equals the booking link
        { user_id: userId }      // <-- use snake_case column name
      );
    } else {
      await databases.updateDocument(
        databaseId,
        publicProfilesTableId,
        newLink,
        { user_id: userId }      // <-- use snake_case column name
      );
    }

    // 4) Also save to your account prefs (for convenience in Dashboard)
    await account.updatePrefs({ bookingLink: newLink });

    setOriginalLink(newLink);
    setCustomLink(newLink);
    setLinkSaved(true);
    setTimeout(() => setLinkSaved(false), 2000);
  } catch (err) {
    console.error("Failed to save booking link:", err);
    alert(err?.message || "Error saving booking link.");
  }
};



  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) return <p className="text-white p-4">Loading...</p>;
  if (!userId) return <p className="text-white p-4">You must be logged in to view this page.</p>;

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Top nav (matches Home) */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
        <nav className="space-x-6 text-sm">
          <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
          <button onClick={handleLogout} className="text-gray-300 hover:text-white">
            Logout
          </button>
        </nav>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Your Dashboard</h1>

        <section className="bg-[#0f172a] p-4 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Calendar</h2>
          <AvailabilityCalendar userId={userId} userTimezone={userTimezone} />
        </section>

        {/* Toggle Buttons (only one open at a time) */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded ${openPanel === "profile" ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => togglePanel("profile")}
          >
            {openPanel === "profile" ? "Hide" : "Show"} Profile Settings
          </button>

          <button
            className={`px-4 py-2 rounded ${openPanel === "availability" ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => togglePanel("availability")}
          >
            {openPanel === "availability" ? "Hide" : "Show"} Availability Settings
          </button>

          <button
            className={`px-4 py-2 rounded ${openPanel === "custom" ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => togglePanel("custom")}
          >
            {openPanel === "custom" ? "Hide" : "Add"} Custom Slot
          </button>

          <button
            className={`px-4 py-2 rounded ${openPanel === "link" ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"}`}
            onClick={() => togglePanel("link")}
          >
            {openPanel === "link" ? "Hide" : "Edit"} Booking Link
          </button>
        </div>

        {/* Animated Sections */}
        <CollapsibleSection
          show={openPanel === "profile"}
          className="bg-gray-900 border border-gray-800 rounded-lg mb-6"
        >
          <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
          <ProfileForm userId={userId} />
        </CollapsibleSection>

        <CollapsibleSection
          show={openPanel === "availability"}
          className="bg-gray-900 border border-gray-800 rounded-lg mb-6"
        >
          <h3 className="text-lg font-semibold mb-4">Availability Settings</h3>
          <AvailabilitySettingsForm userId={userId} />
        </CollapsibleSection>

        <CollapsibleSection
          show={openPanel === "custom"}
          className="bg-gray-900 border border-gray-800 rounded-lg mb-6"
        >
          <h3 className="text-lg font-semibold mb-4">Add a Custom Availability Slot</h3>
          <AvailabilityForm userId={userId} />
        </CollapsibleSection>

        <CollapsibleSection
          show={openPanel === "link"}
          className="bg-gray-900 border border-indigo-500/40 rounded-lg mb-6"
        >
          <h3 className="text-lg font-semibold mb-3">Edit Your Booking Link</h3>
          <p className="text-gray-400 text-sm mb-4">
            This is the link you'll share with clients. Customise it and click to copy.
          </p>

          <div className="bg-[#0e111a] border border-gray-700 rounded-md p-4 w-full max-w-xl">
            <label className="block text-sm text-gray-400 font-mono mb-1">Booking Link:</label>
            <div className="flex items-center bg-black border border-gray-700 rounded overflow-hidden">
              <span className="px-3 text-gray-500 font-mono text-sm bg-gray-900 border-r border-gray-800 select-none">
                solodesk.co.uk/
              </span>
              <input
                type="text"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                className="flex-1 bg-black text-white font-mono px-3 py-2 text-sm outline-none"
                placeholder="yourname"
              />
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://solodesk.co.uk/${customLink}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
              >
                Copy
              </button>
              <button
                onClick={handleSaveCustomLink}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1 rounded text-sm"
              >
                Save
              </button>

              {linkSaved && <span className="text-green-500 text-sm">Saved!</span>}
              {copied && <span className="text-indigo-400 text-sm">Copied!</span>}
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

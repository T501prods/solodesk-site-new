// src/lib/appwrite.js
import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

// debug logs for netlify
console.log("[SoloDesk] App booting…");
console.log("[SoloDesk] Env check", {
  endpointOk: !!import.meta.env.VITE_APPWRITE_ENDPOINT,
  projectOk: !!import.meta.env.VITE_APPWRITE_PROJECT_ID,
  databaseOk: !!import.meta.env.VITE_APPWRITE_DATABASE_ID,
});

export { client, account, databases };

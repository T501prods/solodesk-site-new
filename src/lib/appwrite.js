// src/lib/appwrite.js
import { Client, Account, Databases } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const project  = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const database = import.meta.env.VITE_APPWRITE_DATABASE_ID;

if (!endpoint || !project || !database) {
  throw new Error("[SoloDesk] Missing required Appwrite env vars");
}

const client = new Client().setEndpoint(endpoint).setProject(project);

const account = new Account(client);
const databases = new Databases(client);

// Dev-only logs
if (import.meta.env.DEV) {
  console.log("[SoloDesk] App booting…");
  console.log("[SoloDesk] Env check", {
    endpointOk: !!endpoint,
    projectOk: !!project,
    databaseOk: !!database,
  });
}

export { client, account, databases };

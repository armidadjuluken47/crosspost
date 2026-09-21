import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const databaseId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || "(default)";

function loadServiceAccount(): admin.ServiceAccount | undefined {
  const base64 = process.env.FIREBASE_SA_JSON_BASE64?.trim();
  if (base64) {
    try {
      return JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as admin.ServiceAccount;
    } catch {
      console.warn("FIREBASE_SA_JSON_BASE64 is invalid JSON");
      return undefined;
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) return undefined;

  const absolute = resolve(process.cwd(), credPath);
  if (!existsSync(absolute)) {
    console.warn(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${absolute}`);
    return undefined;
  }

  return JSON.parse(readFileSync(absolute, "utf8")) as admin.ServiceAccount;
}

export function initFirebaseAdmin(): boolean {
  if (admin.apps.length) return true;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
    return true;
  } catch (error) {
    console.error("Firebase Admin failed to initialize:", error);
    return false;
  }
}

export function getAdminDb() {
  if (!initFirebaseAdmin()) {
    throw new Error("Firebase Admin is not configured (missing service account)");
  }
  return getFirestore(databaseId);
}

export async function verifyIdToken(idToken: string) {
  if (!initFirebaseAdmin()) {
    throw new Error("Firebase Admin is not configured (missing service account)");
  }
  return admin.auth().verifyIdToken(idToken);
}

export function isFirebaseReady(): boolean {
  return initFirebaseAdmin();
}

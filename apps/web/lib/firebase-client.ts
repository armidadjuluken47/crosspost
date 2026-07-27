import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);

export type { User as FirebaseUser };

function authErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "auth/popup-closed-by-user") {
    return "Sign-in was cancelled.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup blocked — trying redirect sign-in.";
  }
  if (error instanceof Error) return error.message;
  return "Sign-in failed. Please try again.";
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    return await signInWithPopup(firebaseAuth, provider);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    }
    throw new Error(authErrorMessage(error));
  }
}

export async function signOutCreator() {
  await signOut(firebaseAuth);
}

export async function getCreatorIdToken(forceRefresh = false) {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

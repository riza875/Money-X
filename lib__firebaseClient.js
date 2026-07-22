import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Client-side Firebase config — these NEXT_PUBLIC_ values are safe to expose,
// unlike the Admin SDK service account used in lib/firebaseAdmin.js.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Swap this for real sign-in (email/password, Google, Telegram login widget, etc.)
// once you're ready — anonymous auth is just the fastest path to a working demo.
export function ensureSignedIn() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) return resolve(user);
      signInAnonymously(auth).then((cred) => resolve(cred.user)).catch(reject);
    });
  });
}

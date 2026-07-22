import { getAuth } from "firebase-admin/auth";
import "./firebaseAdmin"; // ensures the admin app is initialized first

// Reads the Firebase ID token from the Authorization header, verifies it,
// and returns the uid — or sends a 401 and returns null.
// Frontend should call: fetch(url, { headers: { Authorization: `Bearer ${idToken}` } })
export async function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Missing auth token" });
    return null;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired auth token" });
    return null;
  }
}

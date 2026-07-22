import { db } from "../../../lib/firebaseAdmin";
import { requireAuth } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await requireAuth(req, res);
  if (!uid) return;

  const snap = await db
    .collection("transactions")
    .doc(uid)
    .collection("history")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const history = snap.docs.map((d) => ({ txHash: d.id, ...d.data() }));
  return res.status(200).json({ history });
}

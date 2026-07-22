import { db } from "../../../lib/firebaseAdmin";
import { getBalances } from "../../../lib/alchemy";
import { requireAuth } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = await requireAuth(req, res);
  if (!uid) return;

  const doc = await db.collection("wallets").doc(uid).get();
  if (!doc.exists) return res.status(404).json({ error: "Wallet not created yet" });

  const { address } = doc.data();
  const balances = await getBalances(address);

  return res.status(200).json({ address, balances });
}

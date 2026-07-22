import { ethers } from "ethers";
import { db } from "../../../lib/firebaseAdmin";
import { encryptPrivateKey } from "../../../lib/crypto";
import { requireAuth } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await requireAuth(req, res);
  if (!uid) return; // requireAuth already sent the 401 response

  const existing = await db.collection("wallets").doc(uid).get();
  if (existing.exists) {
    return res.status(200).json({ address: existing.data().address, alreadyExisted: true });
  }

  // ethers.Wallet.createRandom() uses a CSPRNG under the hood — safe for real funds
  // as long as WALLET_ENCRYPTION_KEY and this endpoint are properly locked down.
  const wallet = ethers.Wallet.createRandom();

  await db.collection("wallets").doc(uid).set({
    address: wallet.address,
    encryptedKey: encryptPrivateKey(wallet.privateKey),
    createdAt: new Date(),
  });

  // Only the public address ever leaves the server.
  return res.status(201).json({ address: wallet.address, alreadyExisted: false });
}

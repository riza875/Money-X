import { ethers } from "ethers";
import { db } from "../../../lib/firebaseAdmin";
import { decryptPrivateKey } from "../../../lib/crypto";
import { sendAsset } from "../../../lib/alchemy";
import { requireAuth } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const uid = await requireAuth(req, res);
  if (!uid) return;

  const { asset, to, amount } = req.body || {};

  if (!asset || !["ETH", "USDT", "USDC"].includes(asset)) {
    return res.status(400).json({ error: "asset must be one of ETH, USDT, USDC" });
  }
  if (!to || !ethers.isAddress(to)) {
    return res.status(400).json({ error: "to must be a valid Ethereum address" });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const doc = await db.collection("wallets").doc(uid).get();
  if (!doc.exists) return res.status(404).json({ error: "Wallet not created yet" });

  const { encryptedKey, address } = doc.data();

  let privateKey;
  try {
    privateKey = decryptPrivateKey(encryptedKey);
  } catch (err) {
    // Never leak decryption details to the client.
    console.error("Key decryption failed for uid", uid, err.message);
    return res.status(500).json({ error: "Could not access wallet key" });
  }

  try {
    const txHash = await sendAsset({ privateKey, asset, to, amount: String(amount) });

    await db
      .collection("transactions")
      .doc(uid)
      .collection("history")
      .doc(txHash)
      .set({
        direction: "out",
        asset,
        amount: String(amount),
        counterparty: to,
        status: "pending",
        createdAt: new Date(),
      });

    return res.status(200).json({ txHash, from: address, to, asset, amount });
  } catch (err) {
    console.error("Send failed:", err.message);
    return res.status(502).json({ error: "Transaction failed to broadcast", detail: err.message });
  } finally {
    // Best-effort: drop the reference so it isn't held in memory longer than needed.
    privateKey = null;
  }
}

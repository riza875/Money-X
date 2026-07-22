import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel/Railway env vars store \n as literal characters — convert back to real newlines.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

export const db = getFirestore();

/*
Firestore layout used by this project:

wallets/{uid}
  address: string            (public ETH address)
  encryptedKey: string        (AES-256-GCM payload from lib/crypto.js — NEVER return this to the client)
  createdAt: Timestamp

transactions/{uid}/history/{txHash}
  direction: "in" | "out"
  asset: "ETH" | "USDT" | "USDC"
  amount: string
  counterparty: string
  status: "pending" | "confirmed"
  createdAt: Timestamp
*/

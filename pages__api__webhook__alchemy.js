import crypto from "crypto";
import { db } from "../../../lib/firebaseAdmin";

// Alchemy sends the raw body signed with your webhook's signing key (from the
// dashboard when you create an "Address Activity" webhook). Next.js parses JSON
// bodies by default, so we disable that here to verify against the exact raw bytes.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function isValidSignature(rawBody, signature) {
  const hmac = crypto.createHmac("sha256", process.env.ALCHEMY_WEBHOOK_SIGNING_KEY);
  hmac.update(rawBody, "utf8");
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature || ""));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-alchemy-signature"];

  if (!isValidSignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const payload = JSON.parse(rawBody);
  const activities = payload?.event?.activity || [];

  // Match each incoming transfer to a wallet we manage, then log it as a deposit.
  const walletsSnap = await db.collection("wallets").get();
  const addressToUid = new Map();
  walletsSnap.forEach((doc) => addressToUid.set(doc.data().address.toLowerCase(), doc.id));

  for (const activity of activities) {
    const toAddress = (activity.toAddress || "").toLowerCase();
    const uid = addressToUid.get(toAddress);
    if (!uid) continue; // not one of our custodial wallets

    const asset = activity.asset || "ETH";
    const txHash = activity.hash;

    await db
      .collection("transactions")
      .doc(uid)
      .collection("history")
      .doc(txHash)
      .set(
        {
          direction: "in",
          asset,
          amount: String(activity.value ?? "0"),
          counterparty: activity.fromAddress,
          status: "confirmed",
          createdAt: new Date(),
        },
        { merge: true }
      );
  }

  return res.status(200).json({ received: true });
}

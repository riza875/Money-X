import { useEffect, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ensureSignedIn, auth } from "../lib/firebaseClient";

const PRICE_ESTIMATE = { ETH: 3070, USDT: 1, USDC: 1 }; // rough display-only conversion; swap for a real price feed later

export default function Wallet() {
  const [uid, setUid] = useState(null);
  const [address, setAddress] = useState(null);
  const [balances, setBalances] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null); // "receive" | "send" | null
  const [sendForm, setSendForm] = useState({ asset: "ETH", to: "", amount: "" });
  const [sendStatus, setSendStatus] = useState(null);
  const [toast, setToast] = useState("");

  const authedFetch = useCallback(async (url, options = {}) => {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }, []);

  const refresh = useCallback(async () => {
    const [balRes, histRes] = await Promise.all([
      authedFetch("/api/wallet/balance"),
      authedFetch("/api/wallet/history"),
    ]);
    setAddress(balRes.address);
    setBalances(balRes.balances);
    setHistory(histRes.history);
  }, [authedFetch]);

  useEffect(() => {
    (async () => {
      const user = await ensureSignedIn();
      setUid(user.uid);
      try {
        await authedFetch("/api/wallet/create", { method: "POST" });
        await refresh();
      } catch (err) {
        showToast(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [authedFetch, refresh]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    showToast("Alamat disalin");
  }

  async function submitSend(e) {
    e.preventDefault();
    setSendStatus("sending");
    try {
      const res = await authedFetch("/api/wallet/send", {
        method: "POST",
        body: JSON.stringify(sendForm),
      });
      setSendStatus("done");
      showToast(`Terkirim — tx ${res.txHash.slice(0, 10)}…`);
      await refresh();
      setTimeout(() => {
        setSheet(null);
        setSendStatus(null);
        setSendForm({ asset: "ETH", to: "", amount: "" });
      }, 1200);
    } catch (err) {
      setSendStatus(null);
      showToast(err.message);
    }
  }

  const totalUsd = balances
    ? Object.entries(balances).reduce((sum, [key, val]) => {
        const symbol = key === "eth" ? "ETH" : key;
        return sum + Number(val) * (PRICE_ESTIMATE[symbol] || 0);
      }, 0)
    : 0;

  if (loading) {
    return (
      <div className="device center">
        <p className="muted">Menyiapkan wallet…</p>
      </div>
    );
  }

  return (
    <div className="device">
      <header>
        <div className="topbar">
          <span>NODEWALLET</span>
          <div className="net">
            <span className="dot" /> Ethereum Mainnet
          </div>
        </div>
        <div className="balance-block">
          <div className="balance-label">Total saldo</div>
          <div className="balance-amt">
            <span>${totalUsd.toFixed(2)}</span>
            <span className="cur">USD</span>
          </div>
        </div>
      </header>

      <div className="actions">
        <button className="action-btn" onClick={() => setSheet("receive")}>
          <div className="ic">↓</div>
          <span>Terima</span>
        </button>
        <button className="action-btn" onClick={() => setSheet("send")}>
          <div className="ic">↑</div>
          <span>Kirim</span>
        </button>
        <button className="action-btn" onClick={() => showToast("Swap segera hadir")}>
          <div className="ic">⇄</div>
          <span>Swap</span>
        </button>
        <button className="action-btn" onClick={() => showToast("Beli via provider pihak ketiga")}>
          <div className="ic">＋</div>
          <span>Beli</span>
        </button>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Aset</h3>
          <span className="see-all" onClick={refresh}>Segarkan</span>
        </div>
        {balances &&
          Object.entries(balances).map(([key, val]) => {
            const symbol = key === "eth" ? "ETH" : key;
            return (
              <div className="asset-row" key={key}>
                <div className={`asset-icon icon-${symbol.toLowerCase()}`}>
                  {symbol === "ETH" ? "Ξ" : symbol[0]}
                </div>
                <div className="asset-info">
                  <div className="asset-name">{symbol === "ETH" ? "Ethereum" : symbol}</div>
                  <div className="asset-net">{symbol} · Mainnet</div>
                </div>
                <div className="asset-val">
                  <div className="asset-amt">{Number(val).toFixed(4)}</div>
                  <div className="asset-fiat">
                    ${(Number(val) * (PRICE_ESTIMATE[symbol] || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Aktivitas</h3>
        </div>
        {history.length === 0 && <p className="muted small">Belum ada transaksi.</p>}
        {history.map((tx) => (
          <div className="tx-row" key={tx.txHash}>
            <div className={`tx-ic ${tx.direction === "in" ? "tx-in" : "tx-out"}`}>
              {tx.direction === "in" ? "↓" : "↑"}
            </div>
            <div className="tx-mid">
              <div className="tx-title">{tx.direction === "in" ? "Diterima" : "Terkirim"}</div>
              <div className="tx-sub">
                {tx.counterparty.slice(0, 6)}…{tx.counterparty.slice(-4)} · {tx.status}
              </div>
            </div>
            <div className={`tx-amt ${tx.direction === "in" ? "in" : "out"}`}>
              {tx.direction === "in" ? "+" : "-"}
              {tx.amount} {tx.asset}
            </div>
          </div>
        ))}
      </div>

      <footer>
        <div className="addr-card">
          <div className="addr-txt">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
          </div>
          <button className="copy-btn" onClick={copyAddress}>Salin alamat</button>
        </div>
      </footer>

      {sheet === "receive" && (
        <div className="overlay show" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h4>Terima aset</h4>
            <p className="sub">Kirim ETH atau token ERC20 ke alamat ini</p>
            <div className="qr-box">
              {address && <QRCodeCanvas value={address} size={160} />}
            </div>
            <div className="full-addr">{address}</div>
            <button className="close-btn" onClick={() => setSheet(null)}>Selesai</button>
          </div>
        </div>
      )}

      {sheet === "send" && (
        <div className="overlay show" onClick={() => setSheet(null)}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submitSend}>
            <h4>Kirim aset</h4>
            <p className="sub">Transaksi ini akan langsung tercatat di blockchain</p>
            <select
              className="input"
              value={sendForm.asset}
              onChange={(e) => setSendForm({ ...sendForm, asset: e.target.value })}
            >
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
            </select>
            <input
              className="input"
              placeholder="Alamat tujuan (0x...)"
              value={sendForm.to}
              onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Jumlah"
              type="number"
              step="any"
              min="0"
              value={sendForm.amount}
              onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
              required
            />
            <button className="close-btn" type="submit" disabled={sendStatus === "sending"}>
              {sendStatus === "sending" ? "Mengirim…" : "Kirim sekarang"}
            </button>
          </form>
        </div>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

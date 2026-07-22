import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from "ethers";

const NETWORK_MAP = {
  "eth-mainnet": Network.ETH_MAINNET,
  "eth-sepolia": Network.ETH_SEPOLIA, // use for testing before going to mainnet with real funds
};

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: NETWORK_MAP[process.env.ALCHEMY_NETWORK] || Network.ETH_MAINNET,
};

export const alchemy = new Alchemy(settings);

// An ethers provider backed by the same Alchemy endpoint, used for signing + broadcasting.
export function getProvider() {
  return new ethers.AlchemyProvider(
    process.env.ALCHEMY_NETWORK === "eth-sepolia" ? "sepolia" : "mainnet",
    process.env.ALCHEMY_API_KEY
  );
}

export const TOKENS = {
  USDT: { address: process.env.TOKEN_USDT, decimals: 6 },
  USDC: { address: process.env.TOKEN_USDC, decimals: 6 },
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

// Returns { eth: "1.284", USDT: "620.00", USDC: "252.18" } for a given address.
export async function getBalances(address) {
  const provider = getProvider();
  const ethBalanceWei = await provider.getBalance(address);
  const result = { eth: ethers.formatEther(ethBalanceWei) };

  for (const [symbol, token] of Object.entries(TOKENS)) {
    if (!token.address) continue;
    const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
    const raw = await contract.balanceOf(address);
    result[symbol] = ethers.formatUnits(raw, token.decimals);
  }
  return result;
}

// Sends native ETH or an ERC20 token from the custodial wallet identified by privateKey.
export async function sendAsset({ privateKey, asset, to, amount }) {
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);

  if (asset === "ETH") {
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });
    return tx.hash;
  }

  const token = TOKENS[asset];
  if (!token || !token.address) throw new Error(`Unsupported asset: ${asset}`);
  const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
  const decimals = token.decimals ?? (await contract.decimals());
  const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals));
  return tx.hash;
}

// Fetches recent asset transfers in and out of an address — used to backfill history
// for a wallet, in addition to the live webhook in pages/api/webhook/alchemy.js.
export async function getRecentTransfers(address) {
  const [incoming, outgoing] = await Promise.all([
    alchemy.core.getAssetTransfers({
      toAddress: address,
      category: ["external", "erc20"],
      maxCount: 25,
      order: "desc",
    }),
    alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ["external", "erc20"],
      maxCount: 25,
      order: "desc",
    }),
  ]);
  return { incoming: incoming.transfers, outgoing: outgoing.transfers };
}

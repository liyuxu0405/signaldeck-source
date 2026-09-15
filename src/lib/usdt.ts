/** 以太坊主网 USDT（6 位小数）。 */
export const USDT_ERC20_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

/** 公开收款地址。只收 ERC-20 USDT，不要转 ETH / TRC20。 */
export const DEFAULT_USDT_RECEIVE_ADDRESS = "0xd4c36af7eefe19bf6eb84ab00b71c5f8a0e79f49";

/** 套餐对应的 USDT 整数部分；小数由申请 ID 打散，便于链上精确匹配。 */
export const packageUsdt: Record<string, number> = {
  banner: 45,
  featured: 145,
  sponsor: 30,
  pro: 280,
};

export type UsdtQuote = {
  display: string;
  micro: string;
};

export type UsdtTransfer = {
  transaction_id: string;
  to: string;
  value: string;
};

export function validEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function normalizeEvmAddress(address: string) {
  return address.trim().toLowerCase();
}

export function usdtAmountToMicro(amount: string) {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error("金额无效");
  const [whole, frac = ""] = normalized.split(".");
  return (BigInt(whole) * 1_000_000n + BigInt((frac + "000000").slice(0, 6))).toString();
}
export function uniqueUsdtQuote(packageId: string, applicationId: string): UsdtQuote {
  const base = packageUsdt[packageId];
  if (!base) throw new Error("套餐无 USDT 标价");
  let hash = 2166136261;
  for (const char of applicationId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const cents = (hash % 90) + 10;
  const micro = BigInt(base) * 1_000_000n + BigInt(cents) * 10_000n;
  return { display: `${base}.${cents}`, micro: micro.toString() };
}

export function findMatchingTransfer(transfers: UsdtTransfer[], receiveAddress: string, micro: string) {
  const expected = BigInt(micro);
  const to = normalizeEvmAddress(receiveAddress);
  return transfers.find((item) => normalizeEvmAddress(item.to) === to && item.value === expected.toString());
}

export async function fetchIncomingUsdt(receiveAddress: string, apiKey = "", okx?: { apiKey: string; secret: string; passphrase: string }) {
  const transfers: UsdtTransfer[] = [];
  const errors: string[] = [];
  if (okx?.apiKey && okx.secret && okx.passphrase) {
    try {
      const { fetchOkxUsdtDeposits } = await import("./okx-pay");
      transfers.push(...await fetchOkxUsdtDeposits(okx, receiveAddress));
    } catch (reason) {
      errors.push(reason instanceof Error ? reason.message : "OKX 查询失败");
    }
  }
  try {
    transfers.push(...await fetchEtherscanUsdt(receiveAddress, apiKey));
  } catch (reason) {
    errors.push(reason instanceof Error ? reason.message : "Etherscan 查询失败");
  }
  if (transfers.length === 0 && errors.length) throw new Error(errors.join("；"));
  return transfers;
}

async function fetchEtherscanUsdt(receiveAddress: string, apiKey = "") {
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", USDT_ERC20_CONTRACT);
  url.searchParams.set("address", receiveAddress);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "50");
  url.searchParams.set("sort", "desc");
  if (apiKey) url.searchParams.set("apikey", apiKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Etherscan HTTP ${response.status}`);
  const payload = await response.json() as { status?: string; message?: string; result?: unknown };
  if (!Array.isArray(payload.result)) {
    throw new Error(typeof payload.result === "string" ? payload.result : payload.message || "Etherscan 返回无效");
  }
  return payload.result.flatMap((item): UsdtTransfer[] => {
    const row = item as { hash?: string; to?: string; value?: string };
    if (!row.hash || !row.to || !row.value) return [];
    return [{ transaction_id: row.hash, to: row.to, value: row.value }];
  });
}

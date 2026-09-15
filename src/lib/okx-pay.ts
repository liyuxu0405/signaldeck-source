import { createHmac } from "node:crypto";
import { usdtAmountToMicro, type UsdtTransfer } from "./usdt";

export type OkxKeys = {
  apiKey: string;
  secret: string;
  passphrase: string;
};

type OkxResponse<T> = { code?: string; msg?: string; data?: T };

type OkxDeposit = {
  ccy?: string;
  amt?: string;
  txId?: string;
  depId?: string;
  state?: string;
  chain?: string;
};

function sign(secret: string, timestamp: string, method: string, path: string, body = "") {
  return createHmac("sha256", secret).update(timestamp + method + path + body).digest("base64");
}

async function okxGet<T>(keys: OkxKeys, pathWithQuery: string) {
  const timestamp = new Date().toISOString();
  const response = await fetch(`https://www.okx.com${pathWithQuery}`, {
    headers: {
      "OK-ACCESS-KEY": keys.apiKey,
      "OK-ACCESS-SIGN": sign(keys.secret, timestamp, "GET", pathWithQuery),
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": keys.passphrase,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json() as OkxResponse<T>;
  if (!response.ok || payload.code !== "0") {
    throw new Error(payload.msg || `OKX HTTP ${response.status}`);
  }
  return payload.data ?? ([] as T);
}

export function isErc20UsdtChain(chain?: string) {
  const value = (chain ?? "").toUpperCase().replace(/[\s_-]/g, "");
  if (!value) return false;
  if (/(TRC20|TRON|SOL|BSC|POLYGON|ARB|OPMAINNET|AVAX|TON|BTC)/.test(value)) return false;
  return value.includes("ERC20") || value.includes("ETHEREUM") || value.endsWith("ETH");
}

export function mapOkxUsdtDeposits(rows: OkxDeposit[], receiveAddress: string): UsdtTransfer[] {
  return rows.flatMap((item) => {
    if (item.ccy !== "USDT" || item.state !== "2" || !item.amt || !isErc20UsdtChain(item.chain)) return [];
    const id = item.txId || item.depId;
    if (!id) return [];
    return [{
      transaction_id: id,
      to: receiveAddress,
      value: usdtAmountToMicro(item.amt),
    }];
  });
}

export async function fetchOkxUsdtBalance(keys: OkxKeys) {
  let fundingAmount = "0";
  let tradingAmount = "0";
  try {
    const funding = await okxGet<Array<{ ccy?: string; bal?: string; availBal?: string }>>(keys, "/api/v5/asset/balances?ccy=USDT");
    const fundingBal = funding.find((item) => item.ccy === "USDT");
    fundingAmount = fundingBal?.availBal ?? fundingBal?.bal ?? "0";
  } catch {
    fundingAmount = "0";
  }
  try {
    const trading = await okxGet<Array<{ details?: Array<{ ccy?: string; availBal?: string; eq?: string }> }>>(keys, "/api/v5/account/balance?ccy=USDT");
    const tradingBal = trading[0]?.details?.find((item) => item.ccy === "USDT");
    tradingAmount = tradingBal?.availBal ?? tradingBal?.eq ?? "0";
  } catch {
    tradingAmount = "0";
  }
  return {
    funding: fundingAmount,
    trading: tradingAmount,
    total: (Number(fundingAmount) + Number(tradingAmount)).toFixed(6),
  };
}

export async function fetchOkxUsdtDeposits(keys: OkxKeys, receiveAddress: string): Promise<UsdtTransfer[]> {
  const rows = await okxGet<OkxDeposit[]>(keys, "/api/v5/asset/deposit-history?ccy=USDT&limit=100");
  return mapOkxUsdtDeposits(rows, receiveAddress);
}

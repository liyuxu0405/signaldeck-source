import { createHmac } from "node:crypto";
import { usdtAmountToMicro, type UsdtTransfer } from "./usdt";

export type OkxKeys = {
  apiKey: string;
  secret: string;
  passphrase: string;
};

type OkxResponse<T> = { code?: string; msg?: string; data?: T };

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

export async function fetchOkxUsdtBalance(keys: OkxKeys) {
  const funding = await okxGet<Array<{ ccy?: string; bal?: string; availBal?: string }>>(keys, "/api/v5/asset/balances?ccy=USDT");
  const trading = await okxGet<Array<{ details?: Array<{ ccy?: string; availBal?: string; eq?: string }> }>>(keys, "/api/v5/account/balance?ccy=USDT");
  const fundingBal = funding.find((item) => item.ccy === "USDT");
  const tradingBal = trading[0]?.details?.find((item) => item.ccy === "USDT");
  const fundingAmount = fundingBal?.availBal ?? fundingBal?.bal ?? "0";
  const tradingAmount = tradingBal?.availBal ?? tradingBal?.eq ?? "0";
  return {
    funding: fundingAmount,
    trading: tradingAmount,
    total: (Number(fundingAmount) + Number(tradingAmount)).toFixed(6),
  };
}

export async function fetchOkxUsdtDeposits(keys: OkxKeys, receiveAddress: string): Promise<UsdtTransfer[]> {
  const rows = await okxGet<Array<{
    ccy?: string;
    amt?: string;
    txId?: string;
    depId?: string;
    state?: string;
    chain?: string;
  }>>(keys, "/api/v5/asset/deposit-history?ccy=USDT");
  return rows.flatMap((item) => {
    if (item.ccy !== "USDT" || item.state !== "2" || !item.amt) return [];
    const id = item.txId || item.depId;
    if (!id) return [];
    return [{
      transaction_id: id,
      to: receiveAddress,
      value: usdtAmountToMicro(item.amt),
    }];
  });
}

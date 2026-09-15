import { describe, expect, it } from "vitest";
import { DEFAULT_USDT_RECEIVE_ADDRESS, uniqueUsdtQuote } from "./usdt";
import { isErc20UsdtChain, mapOkxUsdtDeposits } from "./okx-pay";

describe("欧易 USDT 入账过滤", () => {
  it("只认 ERC-20，忽略 TRC20 / 其他链", () => {
    expect(isErc20UsdtChain("USDT-ERC20")).toBe(true);
    expect(isErc20UsdtChain("USDT-ETH")).toBe(true);
    expect(isErc20UsdtChain("USDT-TRC20")).toBe(false);
    expect(isErc20UsdtChain("USDT-Polygon")).toBe(false);
    expect(isErc20UsdtChain("")).toBe(false);
  });

  it("成功充值且链为 ERC-20 时转成可匹配的最小单位", () => {
    const quote = uniqueUsdtQuote("pro", "app-aaa");
    const rows = mapOkxUsdtDeposits([
      { ccy: "USDT", amt: quote.display, txId: "0xok", state: "2", chain: "USDT-ERC20" },
      { ccy: "USDT", amt: quote.display, txId: "0xtrc", state: "2", chain: "USDT-TRC20" },
      { ccy: "USDT", amt: quote.display, txId: "0xpending", state: "0", chain: "USDT-ERC20" },
    ], DEFAULT_USDT_RECEIVE_ADDRESS);
    expect(rows).toEqual([{
      transaction_id: "0xok",
      to: DEFAULT_USDT_RECEIVE_ADDRESS,
      value: quote.micro,
    }]);
  });
});

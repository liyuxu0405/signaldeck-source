import { describe, expect, it } from "vitest";
import { DEFAULT_USDT_RECEIVE_ADDRESS, findMatchingTransfer, uniqueUsdtQuote, usdtAmountToMicro, validEvmAddress } from "./usdt";

describe("USDT ERC-20 入账匹配", () => {
  it("同一申请金额稳定，不同申请小数不同", () => {
    const first = uniqueUsdtQuote("pro", "app-aaa");
    expect(first.display).toMatch(/^280\.\d{2}$/);
    expect(uniqueUsdtQuote("pro", "app-aaa")).toEqual(first);
    expect(uniqueUsdtQuote("pro", "app-bbb").display).not.toBe(first.display);
  });

  it("只认收到指定地址且金额完全一致的转账", () => {
    const quote = uniqueUsdtQuote("pro", "app-aaa");
    const hit = findMatchingTransfer([
      { transaction_id: "tx-other", to: "0x1111111111111111111111111111111111111111", value: quote.micro },
      { transaction_id: "tx-wrong-amt", to: DEFAULT_USDT_RECEIVE_ADDRESS, value: "1" },
      { transaction_id: "tx-ok", to: DEFAULT_USDT_RECEIVE_ADDRESS.toUpperCase(), value: quote.micro },
    ], DEFAULT_USDT_RECEIVE_ADDRESS, quote.micro);
    expect(hit?.transaction_id).toBe("tx-ok");
  });

  it("欧易入账金额字符串转成最小单位后可匹配", () => {
    const quote = uniqueUsdtQuote("pro", "app-aaa");
    expect(usdtAmountToMicro(quote.display)).toBe(quote.micro);
  });

  it("校验以太坊地址形态", () => {
    expect(validEvmAddress("not-an-address")).toBe(false);
    expect(validEvmAddress(DEFAULT_USDT_RECEIVE_ADDRESS)).toBe(true);
  });
});

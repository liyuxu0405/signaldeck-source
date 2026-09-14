import { describe, expect, it } from "vitest";
import { domainVerificationToken, validDomainVerificationToken } from "./auth";

describe("域名所有权验证令牌", () => {
  it("按账号和域名生成稳定且不可跨域复用的令牌", async () => {
    const secret = "a".repeat(32);
    const first = await domainVerificationToken("owner@example.com", "api.example.com", secret);
    const same = await domainVerificationToken("owner@example.com", "api.example.com", secret);
    const other = await domainVerificationToken("owner@example.com", "other.example.com", secret);
    expect(first).toBe(same);
    expect(first).not.toBe(other);
    expect(validDomainVerificationToken(first)).toBe(true);
  });

  it("拒绝非标准令牌", () => {
    expect(validDomainVerificationToken("short")).toBe(false);
    expect(validDomainVerificationToken("A".repeat(64))).toBe(false);
  });
});

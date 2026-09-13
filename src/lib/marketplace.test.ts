import { describe, expect, it } from "vitest";
import { getAffiliate, inventorySummary } from "./marketplace";
import { sanitizeReport } from "./report";

const sample = {
  score: 82,
  verdict: "未见明显异常",
  protocol: "openai",
  model: "gpt-4.1-mini",
  host: "api.example.com",
  durationMs: 1200,
  requestCount: 3,
  disclaimer: "风险信号，不是账单审计。",
  checks: [{
    id: "connectivity",
    label: "真实接口可用性",
    status: "pass",
    weight: 15,
    detail: "三组请求均成功。",
  }],
};

describe("变现库存与报告安全", () => {
  it("空位可售且联盟不允许任意跳转", () => {
    const summary = inventorySummary();
    expect(summary.adSlots).toBeGreaterThan(0);
    expect(summary.vacantAds).toBe(summary.adSlots);
    expect(getAffiliate("not-a-partner")).toBeUndefined();
  });

  it("拒绝带密钥字段的公开报告", () => {
    expect(() => sanitizeReport({ ...sample, apiKey: "sk-test" }, "abc12345", "2026-09-14T00:00:00.000Z")).toThrow(/敏感/);
  });

  it("接受去密钥后的检测结果", () => {
    const report = sanitizeReport(sample, "abc12345zz", "2026-09-14T00:00:00.000Z");
    expect(report.host).toBe("api.example.com");
    expect(report.id).toBe("abc12345zz");
  });
});

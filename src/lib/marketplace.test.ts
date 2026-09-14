import { describe, expect, it } from "vitest";
import { catalogStations } from "./catalog";
import { getAffiliate, getCommercialDestination, inventorySummary } from "./marketplace";
import { buildStationBoard } from "./rank";
import { sanitizeReport } from "./report";
import { listingIsLive, type ListingApplication } from "./store";

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
    expect(summary.sponsorSlots).toBe(30);
    expect(summary.rankSlots).toBe(10);
    expect(getAffiliate("not-a-partner")).toBeUndefined();
    expect(getCommercialDestination("listing-a", [{
      id: "listing-a",
      name: "示例站",
      domain: "example.com",
      summary: "示例",
      href: "https://example.com",
      featured: true,
      paid: true,
    }])).toBe("https://example.com/");
  });

  it("拒绝带密钥字段的公开报告", () => {
    expect(() => sanitizeReport({ ...sample, apiKey: "sk-test" }, "abc12345", "2026-09-14T00:00:00.000Z")).toThrow(/敏感/);
  });

  it("接受去密钥后的检测结果", () => {
    const report = sanitizeReport(sample, "abc12345zz", "2026-09-14T00:00:00.000Z");
    expect(report.host).toBe("api.example.com");
    expect(report.id).toBe("abc12345zz");
  });

  it("未检测的目录站点进入待测区，公开报告才进入排名", () => {
    expect(catalogStations.length).toBeGreaterThan(10);
    const empty = buildStationBoard([]);
    expect(empty.ranked).toEqual([]);
    expect(empty.pending.length).toBe(catalogStations.length);
    const target = catalogStations[0];
    const scored = buildStationBoard([{
      id: "abc12345zz",
      createdAt: "2026-09-14T00:00:00.000Z",
      host: target.domain,
      protocol: target.protocol,
      model: "relay-test-model",
      score: 88,
      verdict: "未见明显异常",
    }]);
    expect(scored.ranked[0]?.domain).toBe(target.domain);
    expect(scored.ranked[0]?.score).toBe(88);
    expect(scored.pending.length).toBe(catalogStations.length - 1);

    const omniakey = catalogStations.find((item) => item.domain === "omniakey.com")!;
    const viaApiHost = buildStationBoard([{
      id: "omniakeyreport",
      createdAt: "2026-09-14T00:00:00.000Z",
      host: "api.omniakey.com",
      protocol: "openai",
      model: "relay-test-model",
      score: 91,
      verdict: "未见明显异常",
    }]);
    expect(viaApiHost.ranked.find((item) => item.domain === "omniakey.com")?.score).toBe(91);
    expect(viaApiHost.ranked.find((item) => item.domain === "omniakey.com")?.endpoint).toBe(omniakey.endpoint);
  });

  it("未标记收款的申请即使点过开通也不进入公开展示", () => {
    const base: ListingApplication = {
      id: "app1",
      email: "a@example.com",
      name: "肥猫",
      domain: "api.999555999.com",
      summary: "test",
      href: "https://api.999555999.com",
      packageId: "pro",
      status: "approved",
      createdAt: "2026-09-14T00:00:00.000Z",
    };
    expect(listingIsLive(base)).toBe(false);
    expect(listingIsLive({ ...base, paidAt: "2026-09-14T01:00:00.000Z" })).toBe(true);
    expect(listingIsLive({ ...base, status: "pending", paidAt: "2026-09-14T01:00:00.000Z" })).toBe(false);
  });
});

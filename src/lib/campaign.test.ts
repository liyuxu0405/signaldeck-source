import { describe, expect, it } from "vitest";
import { campaignIsActive, validateCampaign } from "./campaign";

describe("商业活动模型", () => {
  const base = {
    id: "launch-1",
    applicationId: "app-1",
    kind: "banner" as const,
    placementIds: ["home-top"],
    name: "示例活动",
    destinationUrl: "https://example.com/offer",
    status: "active" as const,
    startsAt: "2026-09-01T00:00:00.000Z",
    endsAt: "2026-09-30T23:59:59.000Z",
    createdAt: "2026-08-30T00:00:00.000Z",
  };

  it("只在投放周期和启用状态内生效", () => {
    expect(campaignIsActive(base, Date.parse("2026-09-14T00:00:00Z"))).toBe(true);
    expect(campaignIsActive({ ...base, status: "paused" }, Date.parse("2026-09-14T00:00:00Z"))).toBe(false);
    expect(campaignIsActive(base, Date.parse("2026-10-01T00:00:00Z"))).toBe(false);
  });

  it("拒绝非 HTTPS 地址和反向日期", () => {
    expect(() => validateCampaign({ ...base, destinationUrl: "http://example.com" })).toThrow();
    expect(() => validateCampaign({ ...base, startsAt: base.endsAt, endsAt: base.startsAt })).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  listCommercialMetrics,
  recordCommercialEvent,
  type KvLike,
} from "./store";

class FakeMetricStore implements KvLike {
  readonly values = new Map<string, string>();

  async get(key: string) { return this.values.get(key) ?? null; }
  async put(key: string, value: string) { this.values.set(key, value); }
  async delete(key: string) { this.values.delete(key); }
  async list(options: { prefix?: string; cursor?: string }) {
    const names = [...this.values.keys()].filter((key) => key.startsWith(options.prefix ?? "")).sort();
    return { keys: names.map((name) => ({ name })), list_complete: true };
  }
}

describe("商业曝光与点击归因", () => {
  it("同一曝光 viewId 幂等，独立点击分别计数", async () => {
    const store = new FakeMetricStore();
    const impression = {
      kind: "impression" as const,
      campaignId: "partner-a",
      placementId: "home-top",
      eventId: "view-12345678",
      occurredAt: "2026-09-14T10:00:00.000Z",
      path: "/",
    };
    await recordCommercialEvent(impression, store);
    await recordCommercialEvent(impression, store);
    await recordCommercialEvent({ ...impression, kind: "click", eventId: "click-12345678" }, store);
    await recordCommercialEvent({ ...impression, kind: "click", eventId: "click-87654321" }, store);

    const metrics = await listCommercialMetrics({ from: "2026-09-14", to: "2026-09-14" }, store);
    expect(metrics).toEqual([{
      date: "2026-09-14",
      campaignId: "partner-a",
      placementId: "home-top",
      impressions: 1,
      clicks: 2,
      ctr: 2,
    }]);
  });

  it("拒绝非法标识且不写入存储", async () => {
    const store = new FakeMetricStore();
    await expect(recordCommercialEvent({
      kind: "click",
      campaignId: "../bad",
      placementId: "home-top",
      eventId: "click-12345678",
      occurredAt: "2026-09-14T10:00:00.000Z",
    }, store)).rejects.toThrow(/归因参数/);
    expect(store.values.size).toBe(0);
  });
});

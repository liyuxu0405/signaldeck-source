import { describe, expect, it } from "vitest";
import { buildStationBoard, calculateHistoricalScore } from "./rank";
import type { ReportIndexItem } from "./report";

function report(id: string, createdAt: string, score: number, host = "relay.example.com"): ReportIndexItem {
  return { id, createdAt, score, host, protocol: "openai", model: "gpt-test", verdict: score >= 75 ? "未见明显异常" : "高风险" };
}

const now = Date.parse("2026-09-14T12:00:00.000Z");

describe("历史加权排名", () => {
  it("单个有效样本保留原分数", () => {
    const result = calculateHistoricalScore([report("one", "2026-09-14T00:00:00.000Z", 88)], { now });
    expect(result?.score).toBe(88);
    expect(result?.sampleCount).toBe(1);
  });

  it("每个 UTC 日期只保留最新样本，阻止刷榜", () => {
    const result = calculateHistoricalScore([
      report("old", "2026-09-14T01:00:00.000Z", 100),
      report("new", "2026-09-14T11:00:00.000Z", 40),
      report("previous", "2026-09-13T11:00:00.000Z", 60),
    ], { now });
    expect(result?.sampleCount).toBe(2);
    expect(result?.latest.id).toBe("new");
    expect(result?.score).toBeLessThan(60);
  });

  it("忽略 30 天窗口外样本", () => {
    const result = calculateHistoricalScore([
      report("stale", "2026-07-01T00:00:00.000Z", 100),
      report("fresh", "2026-09-14T00:00:00.000Z", 20),
    ], { now });
    expect(result?.score).toBe(20);
    expect(result?.sampleCount).toBe(1);
  });

  it("站点榜展示加权分、样本量和最近检测时间", () => {
    const board = buildStationBoard([
      report("day-one", "2026-09-13T00:00:00.000Z", 80),
      report("day-two", "2026-09-14T00:00:00.000Z", 100),
    ], { now });
    const row = board.ranked.find((item) => item.domain === "relay.example.com");
    expect(row?.sampleCount).toBe(2);
    expect(row?.score).toBeGreaterThan(80);
    expect(row?.latestScore).toBe(100);
    expect(row?.lastCheckedAt).toBe("2026-09-14T00:00:00.000Z");
  });
});

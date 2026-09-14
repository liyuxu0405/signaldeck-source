import { describe, expect, it } from "vitest";
import { groupReportsByHost } from "./report-groups";
import type { ReportIndexItem } from "./report";

function report(id: string, host: string, createdAt: string, model: string, score: number): ReportIndexItem {
  return { id, host, createdAt, model, score, protocol: "openai", verdict: score >= 75 ? "未见明显异常" : "需观察" };
}

describe("公开报告按网站聚合", () => {
  it("同一网站的多份报告合并为一个条目", () => {
    const groups = groupReportsByHost([
      report("r1", "api.cheaperinference.com", "2026-09-14T10:00:00.000Z", "gpt-a", 100),
      report("r2", "api.cheaperinference.com", "2026-09-13T10:00:00.000Z", "gpt-b", 70),
      report("r3", "api.other.com", "2026-09-12T10:00:00.000Z", "gpt-c", 90),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ host: "api.cheaperinference.com", reportCount: 2, latestScore: 100 });
    expect(groups[0].models).toEqual(["gpt-a", "gpt-b"]);
  });

  it("聚合条目按最近检测时间倒序排列", () => {
    const groups = groupReportsByHost([
      report("old", "old.example.com", "2026-09-10T10:00:00.000Z", "gpt", 90),
      report("new", "new.example.com", "2026-09-14T10:00:00.000Z", "gpt", 80),
    ]);
    expect(groups.map((group) => group.host)).toEqual(["new.example.com", "old.example.com"]);
  });
});

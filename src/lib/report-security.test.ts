import { describe, expect, it } from "vitest";
import { issueReport, newPublishToken } from "./report";
import {
  publishReportDraft,
  readReport,
  saveReportDraft,
  type KvLike,
} from "./store";

class FakeStore implements KvLike {
  readonly values = new Map<string, string>();
  readonly puts: Array<{ key: string; options?: { expirationTtl?: number } }> = [];

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    this.values.set(key, value);
    this.puts.push({ key, options });
  }

  async delete(key: string) {
    this.values.delete(key);
  }
}

const rawResult = {
  score: 100,
  verdict: "未见明显异常",
  protocol: "openai",
  model: "gpt-test",
  host: "api.example.com",
  baseUrl: "https://api.example.com/gateway",
  durationMs: 1200,
  requestCount: 3,
  disclaimer: "仅供风险核验。",
  checks: [
    { id: "ok", label: "通过项", status: "pass", weight: 10, detail: "通过" },
    { id: "bad", label: "失败项", status: "fail", weight: 10, detail: "失败", critical: true },
  ],
};

describe("服务端签发报告", () => {
  it("忽略调用方分数并根据检测项重新计算", () => {
    const report = issueReport(rawResult, "2026-09-14T00:00:00.000Z");
    expect(report.score).toBe(50);
    expect(report.verdict).toBe("高风险");
    expect(report.baseUrl).toBe("https://api.example.com/gateway");
    expect(report.id).toMatch(/^[a-z0-9]{8,20}$/);
  });

  it("生成 256 位发布凭据", () => {
    expect(newPublishToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("不会把 token-billing 等正常检测项误判为 API 密钥", () => {
    expect(() => issueReport({
      ...rawResult,
      checks: [{
        id: "token-billing",
        label: "Token 计数交叉验证",
        status: "pass",
        weight: 10,
        detail: "Token 增量符合预期。",
        evidence: "上报 12 → 24（Δ12）",
      }],
    }, "2026-09-14T00:00:00.000Z")).not.toThrow();
  });

  it("仍然拒绝报告文本中的高置信度密钥", () => {
    expect(() => issueReport({
      ...rawResult,
      checks: [{
        id: "upstream-error",
        label: "上游错误",
        status: "warn",
        weight: 0,
        detail: "上游返回错误",
        evidence: "Authorization: Bearer sk-proj-AbCdEf1234567890",
      }],
    }, "2026-09-14T00:00:00.000Z")).toThrow("报告疑似包含密钥片段");
  });

  it("只通过哈希键保存短期草稿，并可幂等发布原始报告", async () => {
    const store = new FakeStore();
    const report = issueReport(rawResult, "2026-09-14T00:00:00.000Z");
    const token = await saveReportDraft(report, store);

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect([...store.values.keys()].some((key) => key.includes(token))).toBe(false);
    expect(store.puts[0]?.options?.expirationTtl).toBe(900);
    expect(await readReport(report.id, store)).toBeNull();

    const first = await publishReportDraft(token, store);
    const second = await publishReportDraft(token, store);
    expect(first).toEqual(report);
    expect(second?.id).toBe(report.id);
    expect(await readReport(report.id, store)).toEqual(report);
  });

  it("在访问存储前拒绝非法发布凭据", async () => {
    const store = new FakeStore();
    await expect(publishReportDraft("not-a-token", store)).resolves.toBeNull();
    expect(store.puts).toEqual([]);
  });
});

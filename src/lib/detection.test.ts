import { describe, expect, it } from "vitest";
import { estimateTokens, summarize, tokenChecks, usageFields } from "./detection";
import { endpointFor, isPublicAddress } from "./safe-endpoint";

describe("Token 风险分析", () => {
  it("接受与本地基线接近的增量及一致流式计数", () => {
    const checks = tokenChecks("openai", {
      shortInput: 20,
      longInput: 120,
      streamInput: 20,
      localShort: 12,
      localLong: 112,
    });
    expect(checks.map((check) => check.status)).toEqual(["pass", "pass"]);
  });

  it("拒绝显著放大的 Token 增量", () => {
    const [check] = tokenChecks("openai", {
      shortInput: 20,
      longInput: 400,
      localShort: 12,
      localLong: 112,
    });
    expect(check.status).toBe("fail");
    expect(check.critical).toBe(true);
  });

  it("识别 OpenAI usage 中的异源字段", () => {
    expect(usageFields("openai", {
      prompt_tokens: 10,
      completion_tokens: 3,
      total_tokens: 13,
      usage_source: "anthropic",
    })).toEqual(["usage_source"]);
  });

  it("严重失败会锁定为高风险", () => {
    expect(summarize([{ id: "x", label: "x", status: "fail", weight: 10, detail: "x", critical: true }]).verdict).toBe("高风险");
  });

  it("分词基线随文本增长", () => {
    expect(estimateTokens("hello ".repeat(100))).toBeGreaterThan(estimateTokens("hello"));
  });
});

describe("安全接口边界", () => {
  it("拒绝私有和保留地址", () => {
    expect(isPublicAddress("127.0.0.1")).toBe(false);
    expect(isPublicAddress("10.0.0.1")).toBe(false);
    expect(isPublicAddress("169.254.1.1")).toBe(false);
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("fd00::1")).toBe(false);
  });

  it("允许公网地址并规范协议路径", () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(endpointFor(new URL("https://api.example.com"), "openai").pathname).toBe("/v1/chat/completions");
    expect(endpointFor(new URL("https://api.example.com/v1"), "anthropic").pathname).toBe("/v1/messages");
  });
});

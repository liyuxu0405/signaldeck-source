import { describe, expect, it } from "vitest";
import {
  classifyUpstreamError, estimateTokens, protocolShapeCheck, structuredOutputCheck, summarize,
  tokenChecks, toolCallingCheck, usageFields,
} from "./detection";
import { endpointFor, isPublicAddress, modelsEndpointFor, secureEndpoint } from "./safe-endpoint";

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

  it("校验 OpenAI 与 Anthropic 核心响应结构", () => {
    expect(protocolShapeCheck("openai", {
      id: "chatcmpl-123",
      object: "chat.completion",
      choices: [{ message: { role: "assistant", content: "ok" } }],
      usage: { prompt_tokens: 10 },
    }).status).toBe("pass");
    expect(protocolShapeCheck("anthropic", {
      id: "msg_123",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 10 },
    }).status).toBe("pass");
    expect(protocolShapeCheck("gemini", { usage: {} }).critical).toBe(true);
  });

  it("区分认证、额度和模型不可用错误", () => {
    expect(classifyUpstreamError(401, "")).toContain("认证失败");
    expect(classifyUpstreamError(429, "insufficient quota")).toContain("额度不足");
    expect(classifyUpstreamError(404, "model not found")).toContain("模型不存在");
  });

  it("校验工具调用与结构化输出探针", () => {
    expect(toolCallingCheck("openai", {
      choices: [{ message: { tool_calls: [{ function: { name: "signaldeck_probe", arguments: "{\"value\":\"ok\"}" } }] } }],
    }).status).toBe("pass");
    expect(toolCallingCheck("anthropic", {
      content: [{ type: "tool_use", name: "signaldeck_probe", input: { value: "ok" } }],
    }).status).toBe("pass");
    expect(structuredOutputCheck({
      choices: [{ message: { content: "{\"status\":\"ok\"}" } }],
    }).status).toBe("pass");
  });

  it("按可用权重归一化总分", () => {
    expect(summarize([
      { id: "pass", label: "pass", status: "pass", weight: 10, detail: "" },
      { id: "fail", label: "fail", status: "fail", weight: 10, detail: "" },
    ]).score).toBe(50);
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
    expect(isPublicAddress("198.18.2.171")).toBe(false);
    expect(isPublicAddress("203.0.113.1")).toBe(false);
    expect(isPublicAddress("::1")).toBe(false);
    expect(isPublicAddress("fd00::1")).toBe(false);
    expect(isPublicAddress("2001:db8::1")).toBe(false);
  });

  it("允许公网地址并规范协议路径", () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(endpointFor(new URL("https://api.example.com"), "openai").pathname).toBe("/v1/chat/completions");
    expect(endpointFor(new URL("https://api.example.com/v1"), "anthropic").pathname).toBe("/v1/messages");
    expect(endpointFor(new URL("https://api.example.com/v1"), "gemini").pathname).toBe("/v1/chat/completions");
    expect(modelsEndpointFor(new URL("https://api.example.com/v1")).pathname).toBe("/v1/models");
  });

  it("拒绝私网 IP，并接受由 Cloudflare 公网隔离解析的域名", async () => {
    await expect(secureEndpoint("https://127.0.0.1/v1")).rejects.toThrow("私有");
    await expect(secureEndpoint("https://api.b.ai/v1")).resolves.toEqual({
      url: new URL("https://api.b.ai/v1"),
    });
  });
});

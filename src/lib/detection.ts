import { getEncoding } from "js-tiktoken";

export type CheckStatus = "pass" | "warn" | "fail";
export type Protocol = "openai" | "anthropic" | "gemini";

export type DetectionCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  weight: number;
  detail: string;
  evidence?: string;
  critical?: boolean;
};

export type UsageSnapshot = {
  shortInput?: number;
  longInput?: number;
  streamInput?: number;
  localShort: number;
  localLong: number;
};

const foreignOpenAIFields = [
  "input_tokens",
  "output_tokens",
  "claude_cache_creation_5_m_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
  "gemini_prompt_tokens",
  "usage_source",
];

export function estimateTokens(text: string) {
  const encoding = getEncoding("cl100k_base");
  return encoding.encode(text).length;
}

export function usageFields(protocol: Protocol, usage: unknown) {
  if (!usage || typeof usage !== "object") return [];
  const keys = Object.keys(usage);
  if (protocol === "openai" || protocol === "gemini") {
    return keys.filter((key) => foreignOpenAIFields.includes(key));
  }
  return keys.filter((key) => key.startsWith("gemini_") || key === "prompt_tokens" || key === "completion_tokens");
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function protocolShapeCheck(protocol: Protocol, data: Record<string, unknown>): DetectionCheck {
  const usage = record(data.usage);
  if (protocol === "anthropic") {
    const content = Array.isArray(data.content) ? data.content : undefined;
    const valid = data.type === "message" && data.role === "assistant" && Boolean(content?.length) && Boolean(usage);
    const standardId = typeof data.id === "string" && data.id.startsWith("msg_");
    return {
      id: "protocol",
      label: "Anthropic 响应结构",
      status: !valid ? "fail" : standardId ? "pass" : "warn",
      weight: 15,
      critical: !valid,
      detail: !valid
        ? "响应缺少 Anthropic message、assistant、content 或 usage 核心字段。"
        : standardId
          ? "响应结构与 Anthropic Messages 协议一致。"
          : "核心结构有效，但消息 ID 不符合常见的 msg_ 前缀。",
      evidence: `type=${String(data.type ?? "缺失")}；role=${String(data.role ?? "缺失")}；id=${typeof data.id === "string" ? data.id.slice(0, 24) : "缺失"}`,
    };
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = record(choices[0]);
  const valid = Boolean(record(first?.message)) && Boolean(usage);
  const expectedObject = data.object === "chat.completion";
  const standardId = typeof data.id === "string" && data.id.startsWith("chatcmpl-");
  return {
    id: "protocol",
    label: `${protocol === "gemini" ? "Gemini OpenAI 兼容" : "OpenAI"}响应结构`,
    status: !valid ? "fail" : expectedObject && standardId ? "pass" : "warn",
    weight: 15,
    critical: !valid,
    detail: !valid
      ? "响应缺少 choices.message 或 usage 核心字段。"
      : expectedObject && standardId
        ? "响应结构与 Chat Completions 协议一致。"
        : "核心结构有效，但 object 或响应 ID 使用了非标准格式。",
    evidence: `object=${String(data.object ?? "缺失")}；id=${typeof data.id === "string" ? data.id.slice(0, 24) : "缺失"}`,
  };
}

export function classifyUpstreamError(status: number, message: string) {
  const normalized = message.toLowerCase();
  if (status === 401 || status === 403) return `上游返回 ${status}：认证失败，请检查专用 API Key 与模型权限`;
  if (status === 429 && /(quota|credit|balance|billing|额度|余额|欠费)/i.test(normalized)) {
    return "上游额度不足或计费受限，本次检测无效";
  }
  if ((status === 400 || status === 404) && /(model|模型|deployment)/i.test(normalized)) {
    return "目标模型不存在或当前 API Key 无权使用，本次检测无效";
  }
  if (status === 429) return "上游请求过于频繁，请稍后重试";
  return `上游返回 ${status}：${message || "未知错误"}`;
}

export function toolCallingCheck(protocol: Protocol, data: Record<string, unknown>): DetectionCheck {
  let valid = false;
  let evidence = "未找到结构化工具调用";
  if (protocol === "anthropic") {
    const content = Array.isArray(data.content) ? data.content : [];
    const block = content.map(record).find((item) => item?.type === "tool_use");
    const input = record(block?.input);
    valid = block?.name === "signaldeck_probe" && input?.value === "ok";
    if (block) evidence = `type=${String(block.type)}；name=${String(block.name ?? "缺失")}`;
  } else {
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const message = record(record(choices[0])?.message);
    const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const call = record(calls[0]);
    const fn = record(call?.function);
    let args: Record<string, unknown> | undefined;
    try {
      args = typeof fn?.arguments === "string" ? record(JSON.parse(fn.arguments)) : undefined;
    } catch { /* 无效 arguments 会作为失败证据 */ }
    valid = fn?.name === "signaldeck_probe" && args?.value === "ok";
    if (fn) evidence = `name=${String(fn.name ?? "缺失")}；arguments=${args ? "有效 JSON" : "无效"}`;
  }
  return {
    id: "tool-calling",
    label: "Function / Tool Calling",
    status: valid ? "pass" : "fail",
    weight: 10,
    detail: valid ? "模型按指定 schema 返回了可解析的工具调用。" : "模型未按指定 schema 返回工具调用。",
    evidence,
  };
}

export function structuredOutputCheck(data: Record<string, unknown>): DetectionCheck {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = record(record(choices[0])?.message);
  const content = message?.content;
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = typeof content === "string" ? record(JSON.parse(content)) : undefined;
  } catch { /* 非 JSON 内容会作为失败证据 */ }
  const valid = parsed?.status === "ok";
  return {
    id: "structured-output",
    label: "Structured Output",
    status: valid ? "pass" : "fail",
    weight: 10,
    detail: valid ? "模型严格返回了符合 JSON Schema 的对象。" : "模型未返回符合指定 Schema 的 JSON。",
    evidence: parsed ? `status=${String(parsed.status ?? "缺失")}` : "响应内容不是有效 JSON 对象",
  };
}

export function tokenChecks(
  protocol: Protocol,
  usage: UsageSnapshot,
): DetectionCheck[] {
  const { shortInput, longInput, streamInput, localShort, localLong } = usage;
  if (shortInput === undefined || longInput === undefined) {
    return [{
      id: "token-billing",
      label: "Token 计数交叉验证",
      status: "fail",
      weight: 30,
      critical: true,
      detail: "响应缺少可核对的输入 Token 计数，无法审计计费。",
    }];
  }

  const reportedDelta = longInput - shortInput;
  const localDelta = localLong - localShort;
  const ratio = localDelta > 0 ? reportedDelta / localDelta : 0;
  const plausible = reportedDelta > 0 && ratio >= 0.55 && ratio <= 1.65;
  const streamDiff = streamInput === undefined
    ? undefined
    : Math.abs(streamInput - shortInput) / Math.max(shortInput, 1);

  return [
    {
      id: "token-billing",
      label: "Token 增量合理性",
      status: plausible ? "pass" : "fail",
      weight: 22,
      critical: !plausible,
      detail: plausible
        ? "长提示词的上报增量与本地 tokenizer 基线处于合理范围。"
        : "长短提示词的上报增量与本地基线偏差过大，存在统计或计费风险。",
      evidence: `上报 ${shortInput} → ${longInput}（Δ${reportedDelta}）；本地 cl100k 基线 ${localShort} → ${localLong}（Δ${localDelta}）；增量比 ${ratio.toFixed(2)}`,
    },
    {
      id: "stream-usage",
      label: "流式 / 非流式一致性",
      status: streamDiff === undefined ? "warn" : streamDiff <= 0.05 ? "pass" : "fail",
      weight: 13,
      detail: streamDiff === undefined
        ? "上游未在流式响应中返回 usage，无法完成该项交叉核对。"
        : streamDiff <= 0.05
          ? "同一提示词的流式与非流式输入计数差异不超过 5%。"
          : "同一提示词的流式与非流式输入计数差异超过 5%。",
      evidence: streamDiff === undefined ? undefined : `非流式 ${shortInput}；流式 ${streamInput}；差异 ${(streamDiff * 100).toFixed(1)}%`,
    },
  ];
}

export function summarize(checks: DetectionCheck[]) {
  const earned = checks.reduce((total, check) => {
    if (check.status === "pass") return total + check.weight;
    if (check.status === "warn") return total + check.weight * 0.5;
    return total;
  }, 0);
  const available = checks.reduce((total, check) => total + check.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(available ? earned / available * 100 : 0)));
  const critical = checks.some((check) => check.critical && check.status === "fail");
  const verdict = critical || score < 50 ? "高风险" : score < 75 ? "需观察" : "未见明显异常";
  return { score, verdict };
}

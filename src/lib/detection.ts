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
  referenceSource?: "provider" | "estimate";
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
  const { shortInput, longInput, streamInput, localShort, localLong, referenceSource = "estimate" } = usage;
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
  const monotonic = reportedDelta > 0;
  const providerReference = protocol === "anthropic" && referenceSource === "provider";
  const plausible = monotonic && ratio >= (providerReference ? 0.9 : 0.55) && ratio <= (providerReference ? 1.1 : 1.65);
  const streamDiff = streamInput === undefined
    ? undefined
    : Math.abs(streamInput - shortInput) / Math.max(shortInput, 1);

  return [
    {
      id: "token-billing",
      label: providerReference ? "Anthropic count_tokens 核对" : "Token 增量估算参考",
      status: !monotonic ? "fail" : providerReference ? plausible ? "pass" : "fail" : "warn",
      weight: 22,
      critical: !monotonic || (providerReference && !plausible),
      detail: !monotonic
        ? "更长输入的上报 Token 未增加，存在可复核的计数异常。"
        : providerReference
          ? plausible
            ? "响应 usage 与同一上游的 Anthropic count_tokens 计数一致。"
            : "响应 usage 与同一上游的 Anthropic count_tokens 计数偏差超过 10%。"
          : "当前协议没有可用的官方计数接口；本地 tokenizer 仅作趋势参考，不据此判定虚报。",
      evidence: `上报 ${shortInput} → ${longInput}（Δ${reportedDelta}）；${providerReference ? "上游 count_tokens" : "本地 cl100k 估算"} ${localShort} → ${localLong}（Δ${localDelta}）；增量比 ${ratio.toFixed(2)}`,
    },
    {
      id: "stream-usage",
      label: "流式 / 非流式一致性",
      status: streamDiff === undefined ? "warn" : streamDiff <= 0.05 ? "pass" : "fail",
      weight: 13,
      critical: streamDiff !== undefined && streamDiff > 0.05,
      detail: streamDiff === undefined
        ? "上游未在流式响应中返回 usage，无法完成该项交叉核对。"
        : streamDiff <= 0.05
          ? "同一提示词的流式与非流式输入计数差异不超过 5%。"
          : "同一提示词的流式与非流式输入计数差异超过 5%。",
      evidence: streamDiff === undefined ? undefined : `非流式 ${shortInput}；流式 ${streamInput}；差异 ${(streamDiff * 100).toFixed(1)}%`,
    },
  ];
}

export function extractAssistantText(protocol: Protocol, data: Record<string, unknown>) {
  if (protocol === "anthropic") {
    const content = Array.isArray(data.content) ? data.content : [];
    return content.map(record).filter((block) => block?.type === "text").map((block) => String(block?.text ?? "")).join("");
  }
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const content = record(record(choices[0])?.message)?.content;
  return typeof content === "string" ? content : "";
}

export function instructionFollowCheck(text: string): DetectionCheck {
  const hit = text.includes("SIGNALDECK_OK");
  return {
    id: "instruction",
    label: "短输出指令遵循",
    status: hit ? "pass" : "warn",
    weight: 6,
    detail: hit
      ? "短提示响应包含约定标记 SIGNALDECK_OK。"
      : "短提示未回传约定标记。这只能说明指令遵循弱，不能单独证明模型被替换。",
    evidence: text ? `输出截断 ${text.slice(0, 80)}` : "空输出",
  };
}

export function stopReasonCheck(protocol: Protocol, data: Record<string, unknown>): DetectionCheck {
  const reason = protocol === "anthropic"
    ? data.stop_reason
    : record(Array.isArray(data.choices) ? data.choices[0] as Record<string, unknown> : undefined)?.finish_reason;
  const ok = protocol === "anthropic"
    ? reason === "end_turn" || reason === "max_tokens" || reason === "stop_sequence"
    : reason === "stop" || reason === "length";
  return {
    id: "stop-reason",
    label: "结束原因字段",
    status: ok ? "pass" : "warn",
    weight: 6,
    detail: ok ? "响应包含该协议常见的结束原因。" : "缺少或使用了非标准结束原因，可能经过转译层。",
    evidence: `finish/stop=${String(reason ?? "缺失")}`,
  };
}

export function outputBoundCheck(protocol: Protocol, data: Record<string, unknown>, maxTokens: number): DetectionCheck {
  const usage = record(data.usage);
  const output = protocol === "anthropic" ? usage?.output_tokens : usage?.completion_tokens;
  const valid = typeof output === "number";
  const bounded = valid && output <= maxTokens * 3;
  return {
    id: "output-bound",
    label: "输出 Token 上限约束",
    status: !valid ? "warn" : bounded ? "pass" : "fail",
    weight: 6,
    critical: valid && !bounded,
    detail: !valid
      ? "响应未提供输出 Token，无法核对 max_tokens 约束。"
      : bounded
        ? "输出计数未明显突破本次 max_tokens 约束。"
        : "输出计数显著超过本次 max_tokens，存在计费或截断异常。",
    evidence: `max_tokens=${maxTokens}；output=${String(output ?? "缺失")}`,
  };
}

export function streamShapeCheck(protocol: Protocol, text: string): DetectionCheck {
  const hasDone = text.includes("[DONE]");
  const hasData = text.includes("data:");
  const anthropicEvents = /event:\s*(message_start|content_block_delta|message_delta)/.test(text) || text.includes("\"type\":\"message_start\"");
  const valid = protocol === "anthropic" ? hasData && (anthropicEvents || hasDone) : hasData && (hasDone || text.includes("chat.completion.chunk"));
  return {
    id: "stream-shape",
    label: "流式协议形状",
    status: valid ? "pass" : "warn",
    weight: 8,
    detail: valid ? "流式响应符合常见 SSE 分片形态。" : "流式响应缺少常见 SSE 分片标记，可能被聚合或改写。",
    evidence: `data=${hasData}；done=${hasDone}；anthropic事件=${anthropicEvents}`,
  };
}

export function longContextCheck(enabled: boolean, longInput?: number, contextInput?: number): DetectionCheck {
  if (!enabled) {
    return {
      id: "long-context",
      label: "长上下文抽样",
      status: "warn",
      weight: 8,
      detail: "未启用水窗抽样。该项只验证更长输入的 usage 是否继续上升，不是官方百万级上下文账单证明。",
    };
  }
  const grew = typeof longInput === "number" && typeof contextInput === "number" && contextInput > longInput;
  return {
    id: "long-context",
    label: "长上下文抽样",
    status: grew ? "pass" : "fail",
    weight: 10,
    critical: !grew,
    detail: grew
      ? "更长水窗输入的上报 Token 继续增加。"
      : "更长水窗输入的上报 Token 未继续增加，存在可复核的上下文截断或计数异常。",
    evidence: `长提示 ${String(longInput ?? "缺失")} → 水窗 ${String(contextInput ?? "缺失")}`,
  };
}

export function thinkingSignatureCheck(enabled: boolean, signature: unknown): DetectionCheck {
  if (!enabled) {
    return {
      id: "thinking-signature",
      label: "Thinking signature 存在性",
      status: "warn",
      weight: 10,
      detail: "未启用该探针。启用后只检查 opaque signature 的存在与长度，权重较高，但不做离线密码学验签。",
    };
  }
  const validShape = typeof signature === "string" && signature.length >= 100;
  return {
    id: "thinking-signature",
    label: "Thinking signature 存在性",
    status: validShape ? "pass" : "fail",
    weight: 22,
    critical: !validShape,
    detail: validShape
      ? "扩展思考响应包含长度合格的 opaque signature。这不能替代 Anthropic 私钥验签。"
      : "未取得长度合格的 thinking signature。",
    evidence: typeof signature === "string" ? `签名长度 ${signature.length}（内容不展示）` : "无签名",
  };
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

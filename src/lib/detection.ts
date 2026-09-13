import { getEncoding } from "js-tiktoken";

export type CheckStatus = "pass" | "warn" | "fail";

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

export function usageFields(protocol: "openai" | "anthropic", usage: unknown) {
  if (!usage || typeof usage !== "object") return [];
  const keys = Object.keys(usage);
  if (protocol === "openai") {
    return keys.filter((key) => foreignOpenAIFields.includes(key));
  }
  return keys.filter((key) => key.startsWith("gemini_") || key === "prompt_tokens" || key === "completion_tokens");
}

export function tokenChecks(
  protocol: "openai" | "anthropic",
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
  const score = Math.max(0, Math.round(checks.reduce((total, check) => {
    if (check.status === "pass") return total + check.weight;
    if (check.status === "warn") return total + check.weight * 0.5;
    return total;
  }, 0)));
  const critical = checks.some((check) => check.critical && check.status === "fail");
  const verdict = critical || score < 50 ? "高风险" : score < 75 ? "需观察" : "未见明显异常";
  return { score, verdict };
}

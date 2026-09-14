import { summarize, type CheckStatus, type DetectionCheck, type Protocol } from "./detection";

const statuses = new Set<CheckStatus>(["pass", "warn", "fail"]);
const secretPattern = /\b(?:sk|key|token|api[_-]?key)-[A-Za-z0-9_.*-]{4,}/i;

export type PublicReport = {
  id: string;
  createdAt: string;
  score: number;
  verdict: string;
  protocol: Protocol;
  model: string;
  host: string;
  durationMs: number;
  requestCount: number;
  mode?: "standard" | "deep";
  disclaimer: string;
  checks: DetectionCheck[];
};

export type ReportIndexItem = {
  id: string;
  createdAt: string;
  host: string;
  protocol: Protocol;
  model: string;
  score: number;
  verdict: string;
};

export function newReportId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 14);
}

export function newPublishToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function issueReport(input: unknown, createdAt = new Date().toISOString()) {
  return sanitizeReport(input, newReportId(), createdAt);
}

export function sanitizeReport(input: unknown, id: string, createdAt: string): PublicReport {
  if (!input || typeof input !== "object") throw new Error("报告格式无效");
  const raw = input as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (/(apiKey|authorization|password|secret|token)/i.test(key)) {
      throw new Error("报告含有敏感字段，已拒绝保存");
    }
  }

  const protocol = raw.protocol;
  if (protocol !== "openai" && protocol !== "anthropic" && protocol !== "gemini") {
    throw new Error("协议无效");
  }

  const host = asHost(raw.host);
  const model = asText(raw.model, 120);
  const disclaimer = asText(raw.disclaimer, 400);
  const durationMs = asInt(raw.durationMs, 1, 300_000);
  const requestCount = asInt(raw.requestCount, 1, 24);
  const mode = raw.mode === "deep" ? "deep" : "standard";
  const checks = sanitizeChecks(raw.checks);
  const { score, verdict } = summarize(checks);
  const payload: PublicReport = {
    id, createdAt, score, verdict, protocol, model, host, durationMs, requestCount, mode, disclaimer, checks,
  };
  const serialized = JSON.stringify(payload);
  if (serialized.length > 40_000) throw new Error("报告过大，无法公开");
  if (secretPattern.test(serialized)) throw new Error("报告疑似包含密钥片段，已拒绝保存");
  return payload;
}

export function toIndexItem(report: PublicReport): ReportIndexItem {
  return {
    id: report.id,
    createdAt: report.createdAt,
    host: report.host,
    protocol: report.protocol,
    model: report.model,
    score: report.score,
    verdict: report.verdict,
  };
}

function sanitizeChecks(value: unknown): DetectionCheck[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 22) {
    throw new Error("检测项数量无效");
  }
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("检测项无效");
    const check = item as Record<string, unknown>;
    const status = check.status;
    if (status !== "pass" && status !== "warn" && status !== "fail") throw new Error("检测状态无效");
    if (!statuses.has(status)) throw new Error("检测状态无效");
    return {
      id: asText(check.id, 40),
      label: asText(check.label, 80),
      status,
      weight: asInt(check.weight, 0, 40),
      detail: asText(check.detail, 400),
      evidence: typeof check.evidence === "string" ? asText(check.evidence, 240) : undefined,
      critical: check.critical === true,
    };
  });
}

function asHost(value: unknown) {
  const host = asText(value, 253).toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(host) || host.includes("..")) {
    throw new Error("主机名无效");
  }
  return host;
}

function asText(value: unknown, max: number) {
  if (typeof value !== "string") throw new Error("字段格式无效");
  const text = value.trim();
  if (!text || text.length > max) throw new Error("字段长度无效");
  return text;
}

function asInt(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error("数值无效");
  }
  return value;
}

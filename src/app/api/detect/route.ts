import { NextRequest, NextResponse } from "next/server";
import { endpointFor, secureEndpoint } from "@/lib/safe-endpoint";
import {
  classifyUpstreamError, estimateTokens, protocolShapeCheck, summarize, tokenChecks, usageFields,
  type DetectionCheck, type Protocol,
} from "@/lib/detection";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();
let activeJobs = 0;
const shortPrompt = "Reply with exactly SIGNALDECK_OK and nothing else.";
const longPrompt = `${Array.from({ length: 90 }, (_, i) => `audit-marker-${i}`).join(" ")}\nReply with exactly SIGNALDECK_OK and nothing else.`;

type Payload = { baseUrl?: string; apiKey?: string; model?: string; protocol?: Protocol; thinking?: boolean };

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 4;
}

async function limitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new Error("上游响应超过 1 MB 安全限制");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(merged);
}

function usageFrom(protocol: Protocol, data: Record<string, unknown>) {
  const usage = data.usage as Record<string, unknown> | undefined;
  const field = protocol === "anthropic" ? "input_tokens" : "prompt_tokens";
  const value = usage?.[field];
  return typeof value === "number" ? value : undefined;
}

function parseStreamUsage(protocol: Protocol, text: string) {
  let found: number | undefined;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const current = usageFrom(protocol, data);
      if (current !== undefined) found = current;
      if (protocol === "anthropic") {
        const message = data.message as Record<string, unknown> | undefined;
        const nested = message ? usageFrom(protocol, message) : undefined;
        if (nested !== undefined) found = nested;
      }
    } catch { /* 非 JSON SSE 行不影响后续证据 */ }
  }
  return found;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "请求过于频繁，请一分钟后再试" }, { status: 429 });
  if (activeJobs >= 3) return NextResponse.json({ error: "检测任务已满，请稍后重试" }, { status: 503 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 12_000) return NextResponse.json({ error: "请求体过大" }, { status: 413 });

  let input: Payload;
  try { input = await request.json() as Payload; } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  const { baseUrl, apiKey, model, protocol, thinking = false } = input;
  if (!baseUrl || !apiKey || !model || !protocol) return NextResponse.json({ error: "请完整填写检测参数" }, { status: 400 });
  if (!["openai", "anthropic", "gemini"].includes(protocol)) return NextResponse.json({ error: "不支持的协议" }, { status: 400 });
  if (apiKey.length < 8 || apiKey.length > 512 || model.length > 120) return NextResponse.json({ error: "密钥或模型名称格式无效" }, { status: 400 });

  activeJobs += 1;
  const started = Date.now();
  try {
    const safe = await secureEndpoint(baseUrl);
    const endpoint = endpointFor(safe.url, protocol);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (protocol === "openai" || protocol === "gemini") headers.authorization = `Bearer ${apiKey}`;
    else {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    }

    const call = async (prompt: string, stream = false, withThinking = false) => {
      const body = protocol === "openai" || protocol === "gemini"
        ? { model, messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: withThinking ? 1200 : 24, stream, ...(stream ? { stream_options: { include_usage: true } } : {}) }
        : { model, messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: withThinking ? 1200 : 24, stream, ...(withThinking ? { thinking: { type: "enabled", budget_tokens: 1024 } } : {}) };
      const response = await fetch(endpoint, {
        method: "POST", headers, body: JSON.stringify(body),
        redirect: "manual", signal: AbortSignal.timeout(withThinking ? 35_000 : 20_000),
      });
      if (response.status >= 300 && response.status < 400) {
        throw new Error("上游返回重定向，已为安全起见拒绝");
      }
      const text = await limitedText(response);
      if (!response.ok) {
        let message = text.slice(0, 240);
        try {
          const parsed = JSON.parse(text) as { error?: { message?: string } | string };
          message = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? message;
        } catch { /* 返回安全截断的上游消息 */ }
        message = message.replace(/\b(?:sk|key|token)-[A-Za-z0-9_.*-]{4,}/gi, "[已隐藏凭据]");
        throw new Error(classifyUpstreamError(response.status, message));
      }
      if (stream) return { text, data: undefined };
      try { return { text, data: JSON.parse(text) as Record<string, unknown> }; } catch {
        throw new Error("上游返回的不是有效 JSON");
      }
    };

    const [short, long, streamed] = await Promise.all([
      call(shortPrompt),
      call(longPrompt),
      call(shortPrompt, true),
    ]);
    const shortData = short.data!;
    const longData = long.data!;
    const rawUsage = shortData.usage;
    const foreign = usageFields(protocol, rawUsage);
    const responseModel = typeof shortData.model === "string" ? shortData.model : undefined;
    const shape = protocolShapeCheck(protocol, shortData);

    const checks: DetectionCheck[] = [
      {
        id: "connectivity", label: "真实接口可用性", status: "pass", weight: 15,
        detail: "三组受控请求均由服务端直接发往目标接口并获得有效响应。",
        evidence: `目标 ${endpoint.hostname}；Cloudflare 公网隔离路由`,
      },
      shape,
      {
        id: "foreign-fields", label: "异源字段指纹", status: foreign.length ? "fail" : "pass", weight: 10,
        detail: foreign.length ? "发现其他厂商协议的计数字段，疑似存在适配或转译层。" : "未在 usage 中发现已知的跨厂商字段。",
        evidence: foreign.length ? foreign.join(", ") : "未命中已知异源字段",
        critical: foreign.length > 0,
      },
      {
        id: "model", label: "模型字段一致性", status: responseModel ? (responseModel.toLowerCase().includes(model.toLowerCase()) || model.toLowerCase().includes(responseModel.toLowerCase()) ? "pass" : "warn") : "warn", weight: 10,
        detail: responseModel ? `请求 ${model}，响应 ${responseModel}。模型字段可被中转层改写，仅作为辅助证据。` : "响应未提供 model 字段。",
      },
      ...tokenChecks(protocol, {
        shortInput: usageFrom(protocol, shortData),
        longInput: usageFrom(protocol, longData),
        streamInput: parseStreamUsage(protocol, streamed.text),
        localShort: estimateTokens(shortPrompt),
        localLong: estimateTokens(longPrompt),
      }),
    ];

    if (protocol === "anthropic") {
      if (thinking) {
        const probe = await call("Think step by step, then answer: what is 137 + 248?", false, true);
        const content = Array.isArray(probe.data?.content) ? probe.data.content as Array<Record<string, unknown>> : [];
        const signature = content.find((block) => block.type === "thinking")?.signature;
        const validShape = typeof signature === "string" && signature.length >= 100;
        checks.push({
          id: "thinking-signature", label: "Thinking signature 存在性", status: validShape ? "pass" : "fail", weight: 15,
          detail: validShape ? "扩展思考响应包含长度合格的 opaque signature。" : "未取得长度合格的 thinking signature。",
          evidence: typeof signature === "string" ? `签名长度 ${signature.length}（内容不展示）` : "无签名",
          critical: !validShape,
        });
      } else {
        checks.push({ id: "thinking-signature", label: "Thinking signature", status: "warn", weight: 15, detail: "未启用深度探针；该项不会产生约 1,024 个思考 Token 的额外费用。" });
      }
    } else {
      checks.push({
        id: "identity-boundary", label: "身份判断边界", status: "warn", weight: 15,
        detail: `${protocol === "gemini" ? "Gemini OpenAI 兼容" : "OpenAI Chat Completions"}没有可由本服务独立验证的模型签名，本结果只能判断协议与计数异常，不能证明高配模型未被替换。`,
      });
    }

    const summary = summarize(checks);
    return NextResponse.json({
      ...summary, protocol, model, host: endpoint.hostname, durationMs: Date.now() - started,
      checks, requestCount: thinking && protocol === "anthropic" ? 4 : 3,
      disclaimer: "本检测能发现协议转译、Token 增量异常与流式计数差异；不能替代供应商账单，也不能仅凭文本数学证明具体模型身份。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "检测失败";
    return NextResponse.json({ error: message.includes(apiKey) ? "检测失败，已隐藏敏感信息" : message }, { status: 422 });
  } finally {
    activeJobs -= 1;
  }
}

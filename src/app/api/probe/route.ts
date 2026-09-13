import { NextRequest, NextResponse } from "next/server";
import { classifyUpstreamError, type Protocol } from "@/lib/detection";
import { modelsEndpointFor, secureEndpoint } from "@/lib/safe-endpoint";

export const runtime = "nodejs";

type Payload = {
  baseUrl?: string;
  apiKey?: string;
  protocol?: Protocol;
  model?: string;
};

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
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
    if (size > 500_000) {
      await reader.cancel();
      throw new Error("模型列表响应超过 500 KB 安全限制");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(ip)) return NextResponse.json({ error: "预检请求过于频繁，请一分钟后再试" }, { status: 429 });

  let input: Payload;
  try {
    input = await request.json() as Payload;
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { baseUrl, apiKey, protocol, model = "" } = input;
  if (!baseUrl || !apiKey || !protocol) {
    return NextResponse.json({ error: "请先填写接口地址、API Key 和协议" }, { status: 400 });
  }
  if (!["openai", "anthropic", "gemini"].includes(protocol) || apiKey.length < 8 || apiKey.length > 512) {
    return NextResponse.json({ error: "预检参数格式无效" }, { status: 400 });
  }

  try {
    const { url } = await secureEndpoint(baseUrl);
    const endpoint = modelsEndpointFor(url);
    const headers: Record<string, string> = { accept: "application/json" };
    if (protocol === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ error: "模型列表接口返回重定向，已为安全起见拒绝" }, { status: 422 });
    }

    const text = await limitedText(response);
    if (!response.ok) {
      let message = "";
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } | string };
        message = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? "";
      } catch { /* 不返回未经处理的上游正文 */ }
      return NextResponse.json({ error: classifyUpstreamError(response.status, message) }, { status: 422 });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "模型列表接口未返回有效 JSON" }, { status: 422 });
    }
    const entries = data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];
    const models = entries.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const id = (entry as { id?: unknown }).id;
      return typeof id === "string" ? [id] : [];
    }).slice(0, 50);
    const modelAvailable = model ? models.some((id) => id === model) : undefined;

    return NextResponse.json({
      reachable: true,
      host: endpoint.hostname,
      models,
      modelAvailable,
      message: models.length
        ? modelAvailable === false
          ? `连接成功，但模型列表中未找到 ${model}`
          : `连接成功，读取到 ${models.length} 个模型`
        : "连接成功，但上游未返回可识别的模型列表",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "预检失败";
    return NextResponse.json({
      error: message.includes(apiKey) ? "预检失败，已隐藏敏感信息" : message,
    }, { status: 422 });
  }
}

"use client";

import { FormEvent, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, CircleAlert, Gauge, KeyRound,
  LoaderCircle, SearchCheck, ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResultView, type ResultPayload } from "@/components/result-view";
import type { Protocol } from "@/lib/detection";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const isHtml = response.headers.get("content-type")?.includes("text/html") || /^\s*</.test(text);
    throw new Error(isHtml
      ? `服务暂时返回了网页错误（HTTP ${response.status}），请稍后重试`
      : `服务响应格式无效（HTTP ${response.status}）`);
  }
}

export function LiveDashboard() {
  const [protocol, setProtocol] = useState<Protocol>("openai");
  const [mode, setMode] = useState<"standard" | "deep">("standard");
  const [longContext, setLongContext] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probe, setProbe] = useState<{ status: "success" | "warn" | "error"; message: string } | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);

  async function probeEndpoint() {
    setProbeLoading(true);
    setProbe(null);
    try {
      const response = await fetch("/api/probe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ protocol, baseUrl, apiKey, model }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = await readJson<{ message?: string; error?: string; models?: string[] }>(response);
      if (!response.ok) throw new Error(data.error || "连接预检失败");
      const models = data.models ?? [];
      setAvailableModels(models);
      setModel((current) => models.includes(current) ? current : models[0] ?? "");
      setProbe({
        status: models.length ? "success" : "warn",
        message: data.message || "连接预检通过",
      });
    } catch (reason) {
      setAvailableModels([]);
      setModel("");
      setProbe({
        status: "error",
        message: reason instanceof DOMException && reason.name === "TimeoutError"
          ? "连接预检超时，请确认接口地址可用"
          : reason instanceof Error ? reason.message : "连接预检失败",
      });
    } finally {
      setProbeLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ protocol, baseUrl, apiKey, model, thinking, mode, longContext }),
        signal: AbortSignal.timeout(mode === "deep" || longContext ? 120_000 : thinking ? 90_000 : protocol === "anthropic" ? 45_000 : 30_000),
      });
      const data = await readJson<ResultPayload & { error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "检测请求失败");
      setResult(data);
      setApiKey("");
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "TimeoutError"
        ? "检测超过安全等待时间，已在浏览器端终止。请确认上游接口可用后重试。"
        : reason instanceof Error ? reason.message : "检测失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <Badge variant="outline" className="mb-5 border-emerald-200 bg-white/70 px-3 py-1 text-[#176b5b]">
              <Activity className="mr-1.5 size-3.5" />真实请求 · 可公开报告 · 不持久化密钥
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] tracking-[-0.04em] text-slate-950 sm:text-6xl">
              看清 API 背后的<br /><span className="text-[#176b5b]">Token 计数</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              向你的 AI 中转接口发送受控请求，交叉核对计数与协议。检测免费；中转站可购买首页广告、精选收录和联盟跳转。
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              {["不保存 API Key", "付费不改分数", "公开报告可分享"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <SearchCheck className="size-4 text-[#176b5b]" />{item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#176b5b]"><SearchCheck /></span>
              <div>
                <div className="font-semibold">免费检测，流量可变现</div>
                <div className="text-xs text-slate-500">报告公开后进入收录页，广告卖的是这份注意力</div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {[["展示广告", "首页与收录页横幅"], ["精选收录", "付费位置，分数独立"], ["联盟跳转", "/go 跟踪点击"]].map(([a, b]) => (
                <div key={a} className="flex justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span>{a}</span><span className="text-slate-400">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="detect" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={submit} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><KeyRound className="size-5 text-[#176b5b]" /><h2 className="text-lg font-bold">配置一次性检测</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">密钥仅在本次服务端请求的内存中使用；公开报告也不会包含密钥。</p>
            <div className="mt-6">
              <label className="text-sm font-medium">接口协议</label>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {(["openai", "anthropic", "gemini"] as const).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => { setProtocol(item); setThinking(false); setProbe(null); setAvailableModels([]); setModel(""); }}
                    className={`rounded-md px-2 py-2 text-xs font-medium sm:text-sm ${protocol === item ? "bg-white shadow-sm" : "text-slate-500"}`}
                  >
                    {item === "openai" ? "OpenAI" : item === "anthropic" ? "Anthropic" : "Gemini"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium">检测深度</label>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                {(["standard", "deep"] as const).map((item) => (
                  <button type="button" key={item} onClick={() => setMode(item)} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === item ? "bg-white shadow-sm" : "text-slate-500"}`}>
                    {item === "standard" ? "标准检测" : "深度检测"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {mode === "standard"
                  ? `3 个低输出请求${protocol === "anthropic" ? "，另有 2 个不生成内容的 count_tokens 请求" : ""}。`
                  : `额外检查 ${protocol === "anthropic" ? "Tool Calling" : "Function Calling 与 Structured Output"}，会增加 ${protocol === "anthropic" ? 1 : 2} 个请求。`}
              </p>
            </div>
            <label className="mt-5 block text-sm font-medium">中转接口根地址</label>
            <Input className="mt-2" type="url" required value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); setProbe(null); setAvailableModels([]); setModel(""); }} placeholder={protocol === "anthropic" ? "https://relay.example.com" : "https://relay.example.com/v1"} />
            <label className="mt-5 block text-sm font-medium">API Key</label>
            <Input className="mt-2" type="password" required autoComplete="off" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setProbe(null); setAvailableModels([]); setModel(""); }} placeholder="仅用于当前检测" />
            <label className="mt-5 block text-sm font-medium">目标模型</label>
            <select className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#176b5b] focus:ring-3 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400" required disabled={!availableModels.length} value={model} onChange={(e) => setModel(e.target.value)}>
              {!availableModels.length && <option value="">{probeLoading ? "正在读取模型列表…" : "请先预检连接与模型"}</option>}
              {availableModels.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            {protocol === "anthropic" && (
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
                <input type="checkbox" checked={thinking} onChange={(e) => setThinking(e.target.checked)} className="mt-1 accent-[#176b5b]" />
                <span>
                  <span className="block text-sm font-medium">启用 Thinking signature 探针（高权重）</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">额外消耗约 1,024 个思考 Token。只检查 opaque signature 存在与长度，不做离线验签。</span>
                </span>
              </label>
            )}
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={longContext} onChange={(e) => setLongContext(e.target.checked)} className="mt-1 accent-[#176b5b]" />
              <span>
                <span className="block text-sm font-medium">启用长上下文抽样</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">再发一组更长水窗输入，核对 usage 是否继续上升。这不是官方百万级上下文账单证明，会增加费用。</span>
              </span>
            </label>
            <Button type="button" variant="outline" className="mt-5 w-full" disabled={probeLoading || loading || !baseUrl || !apiKey} onClick={probeEndpoint}>
              {probeLoading ? <><LoaderCircle className="animate-spin" />正在检查连接…</> : <><SearchCheck />预检连接与模型</>}
            </Button>
            {probe && <div className={`mt-2 rounded-lg border p-3 text-xs leading-5 ${probe.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : probe.status === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>{probe.message}</div>}
            <div className="mt-6 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"><AlertTriangle className="mr-1 inline size-3.5" />检测会产生真实上游 Token 费用，请使用低额度专用 Key。</div>
            <Button type="submit" className="mt-4 w-full" size="lg" disabled={loading || !model}>
              {loading ? <><LoaderCircle className="animate-spin" />正在发起受控请求…</> : <>开始真实检测 <ArrowRight /></>}
            </Button>
          </form>

          <div aria-live="polite" className="min-h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {loading ? (
              <div className="grid h-full min-h-[470px] place-items-center text-center">
                <div>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50"><LoaderCircle className="size-7 animate-spin text-[#176b5b]" /></span>
                  <h3 className="mt-4 font-semibold">正在核对真实响应</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">依次执行短提示、长提示和流式请求。请勿关闭页面。</p>
                </div>
              </div>
            ) : error ? (
              <div className="grid h-full min-h-[470px] place-items-center text-center">
                <div className="max-w-md">
                  <CircleAlert className="mx-auto size-10 text-red-500" />
                  <h3 className="mt-4 font-semibold">检测未完成</h3>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-500">{error}</p>
                  <Button variant="outline" className="mt-5" onClick={() => setError("")}>返回配置</Button>
                </div>
              </div>
            ) : result ? (
              <ResultView result={result} shareable />
            ) : (
              <div className="grid h-full min-h-[470px] place-items-center text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Gauge className="size-7" /></span>
                  <h3 className="mt-4 font-semibold">等待检测参数</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">完成后可选择公开报告。我们不会用未验证数据编造排行榜；付费精选与分数分开展示。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="method" className="mt-10 bg-[#123f37] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Badge className="bg-white/10 text-emerald-100">判断方法</Badge>
            <h2 className="mt-5 text-3xl font-bold">Token 是否“有水分”，要看交叉证据</h2>
            <p className="mt-4 leading-7 text-emerald-50/70">单次 usage 数字不能自证准确。本实现用相同输出约束的长短输入看增量，用同一输入的流式/非流式计数看一致性，并扫描跨厂商字段残留。</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "增量基线", "Anthropic 交叉核对同一上游的 count_tokens；OpenAI 与 Gemini 的本地 tokenizer 只展示趋势，不据此判定虚报。"],
              ["02", "双路径核对", "同一短提示分别走 stream 与 non-stream；输入计数差异超过 5% 时标记风险。"],
              ["03", "协议指纹", "识别 OpenAI 响应混入 Anthropic / Gemini 命名，或 Anthropic 响应出现 OpenAI 计数字段。"],
            ].map(([n, title, text]) => (
              <div key={n} className="rounded-xl border border-white/10 bg-white/[.06] p-5">
                <span className="font-mono text-xs text-emerald-300">{n}</span>
                <h3 className="mt-8 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-50/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="boundary" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><ShieldCheck /></span>
            <div>
              <div className="text-sm font-semibold text-[#176b5b]">能力边界</div>
              <h2 className="mt-2 text-2xl font-bold">风险信号，不是供应商账单审计</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">OpenAI 没有公开的模型身份签名；本地 tokenizer 也可能与目标模型不同。因此“通过”只表示当前样本未见明显协议与计数异常，不能证明模型绝对真实，也不能证明最终扣费无误。Claude 深度探针仅确认 opaque signature 的存在与长度，未持有 Anthropic 私钥做离线验签。</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Link2, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DetectionCheck } from "@/lib/detection";
import { stationDisplayName, stationLogoUrl } from "@/lib/catalog";
import { StationIdentity } from "@/components/station-identity";

export type ResultPayload = {
  score: number;
  verdict: string;
  protocol: string;
  model: string;
  host: string;
  durationMs: number;
  checks: DetectionCheck[];
  requestCount: number;
  disclaimer: string;
  mode?: "standard" | "deep";
};

const statusMeta = {
  pass: { label: "通过", icon: CheckCircle2, style: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  warn: { label: "待确认", icon: AlertTriangle, style: "text-amber-700 bg-amber-50 border-amber-200" },
  fail: { label: "异常", icon: XCircle, style: "text-red-700 bg-red-50 border-red-200" },
};

export function ResultView({
  result,
  shareable = false,
  publishToken,
}: {
  result: ResultPayload;
  shareable?: boolean;
  publishToken?: string;
}) {
  const color = result.score >= 75 ? "#19745f" : result.score >= 50 ? "#b07920" : "#b33c3c";
  const stationName = stationDisplayName(result.host);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharing, setSharing] = useState(false);

  async function publish() {
    setSharing(true);
    setShareError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: publishToken }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error || "公开失败");
      const url = `${window.location.origin}/r/${data.id}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* 复制失败时仍展示链接 */
      }
    } catch (reason) {
      setShareError(reason instanceof Error ? reason.message : "公开失败");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full text-lg font-bold text-white" style={{ background: color }}>
            {result.score}
          </div>
          <div>
            <Badge variant="outline">{result.verdict}</Badge>
            <div className="mt-2"><StationIdentity name={stationName} logoUrl={stationLogoUrl(result.host)} /></div>
            <p className="mt-1 text-xs text-slate-500">{result.host} · {result.protocol} · {result.model}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-xs text-slate-500">
            <Clock3 className="mr-1 inline size-3.5" />
            {(result.durationMs / 1000).toFixed(1)} 秒 · {result.requestCount} 个请求
          </div>
          {shareable && publishToken && (
            <Button type="button" variant="outline" size="sm" disabled={sharing} onClick={publish}>
              <Link2 />{sharing ? "正在生成链接…" : shareUrl ? "再次复制链接" : "公开这份报告"}
            </Button>
          )}
        </div>
      </div>
      {shareUrl && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
          已公开（不含 API Key）：<a className="break-all underline" href={shareUrl}>{shareUrl}</a>
        </div>
      )}
      {shareError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{shareError}</div>}
      <div className="mt-5 space-y-3">
        {result.checks.map((check) => {
          const meta = statusMeta[check.status];
          const Icon = meta.icon;
          return (
            <div key={check.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className={`size-4 ${check.status === "pass" ? "text-emerald-600" : check.status === "warn" ? "text-amber-600" : "text-red-600"}`} />
                  {check.label}
                </div>
                <Badge variant="outline" className={meta.style}>{check.scored === false ? "说明项" : `${meta.label} · ${check.weight}分`}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{check.detail}</p>
              {check.evidence && <code className="mt-2 block overflow-x-auto rounded-md bg-slate-50 p-2 text-xs text-slate-500">{check.evidence}</code>}
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-600">
        <Sparkles className="mr-1 inline size-3.5" />{result.disclaimer}
      </div>
    </div>
  );
}

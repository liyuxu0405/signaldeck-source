"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_USDT_RECEIVE_ADDRESS, USDT_ERC20_CONTRACT } from "@/lib/usdt";
import type { ListingApplication } from "@/lib/store";

type Lead = Record<string, string>;
type MetricRow = {
  date: string;
  campaignId: string;
  placementId: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
};

export function AdminInbox() {
  const [token, setToken] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [applications, setApplications] = useState<ListingApplication[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [error, setError] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const headers = { authorization: `Bearer ${token}` };
      const [leadRes, appRes, metricRes] = await Promise.all([
        fetch("/api/leads", { headers }),
        fetch("/api/admin/listings", { headers }),
        fetch("/api/admin/metrics", { headers }),
      ]);
      const leadData = await leadRes.json() as { leads?: Lead[]; error?: string };
      const appData = await appRes.json() as { applications?: ListingApplication[]; error?: string };
      const metricData = await metricRes.json() as { rows?: MetricRow[]; error?: string };
      if (!leadRes.ok) throw new Error(leadData.error || "无法读取线索");
      if (!appRes.ok) throw new Error(appData.error || "无法读取申请");
      if (!metricRes.ok) throw new Error(metricData.error || "无法读取投放数据");
      setLeads(leadData.leads ?? []);
      setApplications(appData.applications ?? []);
      setMetrics(metricData.rows ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  async function scanChain(id?: string) {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/cron/usdt", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      const data = await response.json() as { error?: string; settled?: number; checked?: number };
      if (!response.ok) throw new Error(data.error || "链上查询失败");
      setScanNote(data.settled
        ? `链上新确认 ${data.settled} 笔，已自动上架。`
        : `已查 ${data.checked ?? 0} 笔待收款，暂无匹配金额的 USDT 入账。`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "链上查询失败");
    } finally {
      setChecking(false);
    }
  }

  async function decide(id: string, payload: { status?: "approved" | "rejected" | "pending"; paid?: boolean }) {
    const response = await fetch("/api/admin/listings", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setError(data.error || "操作失败");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={load} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="admin-token" className="text-sm font-medium">管理员口令</label>
        <Input id="admin-token" className="mt-2" type="password" required value={token} onChange={(e) => setToken(e.target.value)} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>{loading ? "读取中…" : "打开线索箱"}</Button>
          <Button type="button" variant="outline" disabled={!token || checking} onClick={() => scanChain()}>
            {checking ? "查询链上…" : "检测链上入账"}
          </Button>
        </div>
        {scanNote && <p className="mt-3 text-sm text-emerald-800">{scanNote}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      <section>
        <h2 className="text-xl font-bold">近 7 天广告归因</h2>
        {metrics.length === 0 ? <p className="mt-3 text-sm text-slate-500">暂无可归因的曝光或点击。</p> : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="p-3">日期</th><th className="p-3">活动 / 位置</th><th className="p-3">曝光</th><th className="p-3">点击</th><th className="p-3">CTR</th></tr>
              </thead>
              <tbody>
                {metrics.map((row) => (
                  <tr key={`${row.date}-${row.campaignId}-${row.placementId}`} className="border-t border-slate-100">
                    <td className="p-3">{row.date}</td>
                    <td className="p-3">{row.campaignId} · {row.placementId}</td>
                    <td className="p-3">{row.impressions}</td>
                    <td className="p-3">{row.clicks}</td>
                    <td className="p-3">{row.ctr === null ? "—" : `${(row.ctr * 100).toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold">商务表单线索</h2>
        {leads.length === 0 ? <p className="mt-3 text-sm text-slate-500">还没有线索，或尚未读取。</p> : (
          <ul className="mt-4 space-y-3">
            {leads.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="font-medium">{lead.name} · {lead.contact}</div>
                <div className="mt-1 text-slate-500">{lead.company || "未填站点"} · {lead.packageId} · {lead.createdAt}</div>
                {lead.note && <p className="mt-2 text-slate-600">{lead.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold">站长收录申请</h2>
        {applications.length === 0 ? <p className="mt-3 text-sm text-slate-500">还没有申请，或尚未读取。</p> : (
          <ul className="mt-4 space-y-3">
            {applications.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="font-medium">{item.name} · {item.domain}</div>
                <div className="mt-1 text-slate-500">{item.email} · {item.packageId} · {applicationLabel(item)}</div>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                  {item.usdtAmount ? <div>应付 ERC-20 USDT：<code className="select-all">{item.usdtAmount}</code></div> : <div>尚未生成专属金额，打开线索箱后会补上。</div>}
                  {item.usdtTxHash ? (
                    <div>
                      链上交易：
                      <a className="break-all text-[#176b5b]" href={`https://etherscan.io/tx/${item.usdtTxHash}`} target="_blank" rel="noreferrer">
                        {item.usdtTxHash}
                      </a>
                    </div>
                  ) : (
                    <div>
                      收款地址：
                      <a className="break-all text-[#176b5b]" href={`https://etherscan.io/token/${USDT_ERC20_CONTRACT}?a=${DEFAULT_USDT_RECEIVE_ADDRESS}`} target="_blank" rel="noreferrer">
                        {DEFAULT_USDT_RECEIVE_ADDRESS}
                      </a>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!item.paidAt && item.status !== "rejected" && (
                    <Button type="button" size="sm" onClick={() => scanChain(item.id)} disabled={checking}>检测入账</Button>
                  )}
                  {!item.paidAt && item.status !== "rejected" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => decide(item.id, { paid: true })}>手工标记已收款</Button>
                  )}
                  {item.paidAt && item.status !== "approved" && item.status !== "rejected" && (
                    <Button type="button" size="sm" onClick={() => decide(item.id, { status: "approved" })}>开通展示</Button>
                  )}
                  {item.status === "approved" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => decide(item.id, { status: "pending" })}>下架</Button>
                  )}
                  {item.status !== "rejected" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => decide(item.id, { status: "rejected" })}>拒绝</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function applicationLabel(item: ListingApplication) {
  if (item.status === "rejected") return "未通过";
  if (item.status === "approved" && item.paidAt) return item.usdtTxHash ? "链上已入账并上架" : "已收款并上架";
  if (item.status === "approved") return "误开通（未收款，未对外展示）";
  if (item.paidAt) return "已收款，待上架";
  return "待收款";
}

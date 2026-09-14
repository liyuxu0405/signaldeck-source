"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [loading, setLoading] = useState(false);

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

  async function decide(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/admin/listings", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
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
        <Button type="submit" className="mt-4" disabled={loading}>{loading ? "读取中…" : "打开线索箱"}</Button>
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
                <div className="mt-1 text-slate-500">{item.email} · {item.packageId} · {item.status}</div>
                {item.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" onClick={() => decide(item.id, "approved")}>开通</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => decide(item.id, "rejected")}>拒绝</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

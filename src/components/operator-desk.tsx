"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { packages } from "@/lib/marketplace";
import type { ListingApplication } from "@/lib/store";

const applyPackages = packages.filter((item) => ["featured", "pro", "sponsor", "banner"].includes(item.id));

export function OperatorDesk({
  email,
  initialApplications,
}: {
  email: string;
  initialApplications: ListingApplication[];
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [summary, setSummary] = useState("");
  const [packageId, setPackageId] = useState("pro");
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, domain, summary, packageId }),
      });
      const data = await response.json() as { error?: string; application?: ListingApplication; verification?: { path: string; content: string } };
      if (!response.ok || !data.application) throw new Error(data.error || "提交失败");
      setApplications((current) => [data.application!, ...current]);
      setMessage("已提交，状态为待审核。付款后我们会开通对应位置。");
      setVerification(data.verification ?? null);
      setName("");
      setDomain("");
      setSummary("");
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">申请付费位置</h2>
        <p className="mt-2 text-sm text-slate-500">登录账号：{email}。申请不会改检测分数，也不会自动上线。</p>
        <label htmlFor="op-name" className="mt-5 block text-sm font-medium">展示名称</label>
        <Input id="op-name" className="mt-2" required value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="op-domain" className="mt-4 block text-sm font-medium">站点域名</label>
        <Input id="op-domain" className="mt-2" required placeholder="api.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <label htmlFor="op-summary" className="mt-4 block text-sm font-medium">简介</label>
        <Input id="op-summary" className="mt-2" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <label className="mt-4 block text-sm font-medium">套餐</label>
        <select className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
          {applyPackages.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.price}</option>)}
        </select>
        <Button type="submit" className="mt-5 w-full" disabled={loading}>{loading ? "提交中…" : "提交审核"}</Button>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        {verification && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            审核前请在站点部署 <code>{verification.path}</code>，文件内容为：
            <code className="mt-2 block break-all rounded bg-white p-2 select-all">{verification.content}</code>
          </div>
        )}
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">我的申请</h2>
          <Button variant="outline" type="button" onClick={logout}>退出</Button>
        </div>
        {applications.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">还没有申请。</p>
        ) : (
          <ul className="mt-5 space-y-3 text-sm">
            {applications.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="font-medium">{item.name} · {item.domain}</div>
                <div className="mt-1 text-xs text-slate-500">{item.packageId} · {item.status === "pending" ? "待审核" : item.status === "approved" ? "已开通" : "未通过"}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

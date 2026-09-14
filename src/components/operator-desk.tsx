"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { packages } from "@/lib/marketplace";
import { packageUsdt } from "@/lib/usdt";
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
  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState("");
  const [payAddress, setPayAddress] = useState("");

  useEffect(() => {
    fetch("/api/account/usdt").then(async (response) => {
      const data = await response.json() as { address?: string; configured?: boolean };
      if (data.configured && data.address) setPayAddress(data.address);
    }).catch(() => undefined);
  }, []);

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
      const data = await response.json() as { error?: string; application?: ListingApplication };
      if (!response.ok || !data.application) throw new Error(data.error || "提交失败");
      setApplications((current) => [data.application!, ...current]);
      setMessage("已生成专属 USDT 金额。按金额转入后点「检测入账」，到账即上架。");
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

  async function checkPayment(id: string) {
    setCheckingId(id);
    setMessage("");
    try {
      const response = await fetch("/api/account/usdt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json() as { error?: string; application?: ListingApplication };
      if (data.application) {
        setApplications((current) => current.map((item) => item.id === data.application!.id ? data.application! : item));
      }
      if (!response.ok) throw new Error(data.error || "未检测到入账");
      setMessage("已检测到 USDT 入账，展示位已开通。");
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "检测失败");
    } finally {
      setCheckingId("");
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
        <p className="mt-2 text-sm text-slate-500">登录账号：{email}。申请不会改检测分数。请向以太坊主网 USDT（ERC-20）地址转入指定金额，到账后点检测即可上架。不要转 ETH 或 TRC20。</p>
        <label htmlFor="op-name" className="mt-5 block text-sm font-medium">展示名称</label>
        <Input id="op-name" className="mt-2" required value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="op-domain" className="mt-4 block text-sm font-medium">站点域名</label>
        <Input id="op-domain" className="mt-2" required placeholder="api.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <label htmlFor="op-summary" className="mt-4 block text-sm font-medium">简介</label>
        <Input id="op-summary" className="mt-2" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <label className="mt-4 block text-sm font-medium">套餐</label>
        <select className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
          {applyPackages.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.price} / {packageUsdt[item.id]} USDT 起</option>)}
        </select>
        <Button type="submit" className="mt-5 w-full" disabled={loading}>{loading ? "提交中…" : "提交并生成付款金额"}</Button>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
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
                <div className="mt-1 text-xs text-slate-500">{item.packageId} · {operatorStatus(item)}</div>
                {item.usdtAmount && !item.paidAt && item.status !== "rejected" && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                    <div>网络：Ethereum · ERC-20 USDT</div>
                    <div>金额（必须一致）：<code className="select-all">{item.usdtAmount}</code></div>
                    <div className="break-all">地址：<code className="select-all">{payAddress || "管理员尚未配置收款地址"}</code></div>
                    <Button type="button" size="sm" className="mt-2" disabled={!payAddress || checkingId === item.id} onClick={() => checkPayment(item.id)}>
                      {checkingId === item.id ? "查询链上…" : "检测入账"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function operatorStatus(item: ListingApplication) {
  if (item.status === "rejected") return "未通过";
  if (item.status === "approved" && item.paidAt) return "已开通";
  if (item.paidAt) return "已收款，待开通";
  return "待支付 USDT";
}

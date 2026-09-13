"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { packages } from "@/lib/marketplace";

export function LeadForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "banner");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("idle");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, contact, company, packageId, note }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "提交失败");
      setStatus("ok");
      setMessage("已收到。我们会按联系方式回复档期与合同条款。");
      setNote("");
    } catch (reason) {
      setStatus("error");
      setMessage(reason instanceof Error ? reason.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">留下档期需求</h2>
      <p className="mt-2 text-sm text-slate-500">不自动上线广告。人工确认付款与素材后再改库存。</p>
      <label htmlFor="lead-name" className="mt-5 block text-sm font-medium">联系人</label>
      <Input id="lead-name" className="mt-2" required value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="lead-contact" className="mt-4 block text-sm font-medium">邮箱 / 微信 / Telegram</label>
      <Input id="lead-contact" className="mt-2" required value={contact} onChange={(e) => setContact(e.target.value)} />
      <label htmlFor="lead-company" className="mt-4 block text-sm font-medium">站点或品牌</label>
      <Input id="lead-company" className="mt-2" value={company} onChange={(e) => setCompany(e.target.value)} />
      <label className="mt-4 block text-sm font-medium">意向套餐</label>
      <select className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
        {packages.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.price}</option>)}
      </select>
      <label className="mt-4 block text-sm font-medium">备注</label>
      <textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" className="mt-5 w-full" disabled={loading}>{loading ? "提交中…" : "提交商务意向"}</Button>
      {status !== "idle" && (
        <p className={`mt-3 text-sm ${status === "ok" ? "text-emerald-700" : "text-red-600"}`}>{message}</p>
      )}
    </form>
  );
}

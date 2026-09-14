"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(mode === "login" ? "/api/account/login" : "/api/account/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "失败");
      router.push("/account");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label htmlFor="auth-email" className="text-sm font-medium">邮箱</label>
      <Input id="auth-email" className="mt-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="auth-password" className="mt-4 block text-sm font-medium">密码</label>
      <Input id="auth-password" className="mt-2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" className="mt-5 w-full" disabled={loading}>{loading ? "提交中…" : mode === "login" ? "登录" : "注册站长账号"}</Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}

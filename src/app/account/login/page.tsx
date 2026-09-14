import { AuthForm } from "@/components/auth-form";
import Link from "next/link";

export const metadata = { title: "站长登录｜SignalDeck" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">站长登录</h1>
      <p className="mt-3 text-sm text-slate-600">登录后可申请 PRO、精选收录和广告位。不会保存检测用的 API Key。</p>
      <div className="mt-6"><AuthForm mode="login" /></div>
      <p className="mt-4 text-sm text-slate-500">没有账号？<Link className="text-[#176b5b]" href="/account/register">注册</Link></p>
    </main>
  );
}

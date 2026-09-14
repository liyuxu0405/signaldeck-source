import { AuthForm } from "@/components/auth-form";
import Link from "next/link";

export const metadata = { title: "注册站长账号｜SignalDeck" };

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">注册站长账号</h1>
      <p className="mt-3 text-sm text-slate-600">用于年费收录与广告申请。检测仍然免费，也不在账号里保存上游密钥。</p>
      <div className="mt-6"><AuthForm mode="register" /></div>
      <p className="mt-4 text-sm text-slate-500">已有账号？<Link className="text-[#176b5b]" href="/account/login">登录</Link></p>
    </main>
  );
}

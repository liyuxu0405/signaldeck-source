import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OperatorDesk } from "@/components/operator-desk";
import { SESSION_COOKIE } from "@/lib/auth";
import { listApplications, readSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "站长后台｜SignalDeck" };

export default async function AccountPage() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = id ? await readSession(id) : null;
  if (!email) redirect("/account/login");
  const applications = await listApplications(email);
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">站长后台</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">这里只处理展示位置申请。检测分数仍来自公开报告，与账号是否付费无关。</p>
      <div className="mt-8"><OperatorDesk email={email} initialApplications={applications} /></div>
    </main>
  );
}

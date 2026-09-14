import { AdminInbox } from "@/components/admin-inbox";

export const metadata = { title: "商务后台｜SignalDeck" };

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">商务后台</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">合作意向不会发到邮箱。用 Cloudflare 里的 ADMIN_TOKEN 打开这页，即可看到表单线索和站长申请。</p>
      <div className="mt-8"><AdminInbox /></div>
    </main>
  );
}

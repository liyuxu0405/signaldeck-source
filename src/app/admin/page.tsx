import { AdminInbox } from "@/components/admin-inbox";

export const metadata = { title: "商务后台｜SignalDeck" };

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold">商务后台</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">用 ADMIN_TOKEN 打开线索箱后，点「检测链上入账」。系统会对照每笔申请的专属 USDT 金额查询以太坊收款地址；匹配成功会显示交易哈希并自动上架。没有链上记录时仍显示待收款。</p>
      <div className="mt-8"><AdminInbox /></div>
    </main>
  );
}

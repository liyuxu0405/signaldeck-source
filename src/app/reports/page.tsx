import Link from "next/link";
import { ReportList } from "@/components/report-list";
import { listRecentReports } from "@/lib/store";
import { groupReportsByHost } from "@/lib/report-groups";

export const dynamic = "force-dynamic";
export const metadata = { title: "公开报告列表", description: "SignalDeck 服务端签发的 AI API 中转站公开检测报告。" };

export default async function ReportsPage() {
  const reports = await listRecentReports();
  const groups = groupReportsByHost(reports);
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium text-[#176b5b]">Public reports</p>
      <h1 className="mt-3 text-4xl font-bold">本站公开报告</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">同一网站的报告合并展示。点击检测次数进入该网站的全部报告，再点击单次记录查看完整检测证据。</p>
      <div className="mt-8">{groups.length ? <ReportList groups={groups} /> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">暂无公开报告。</div>}</div>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-[#176b5b]">开始检测 →</Link>
    </main>
  );
}
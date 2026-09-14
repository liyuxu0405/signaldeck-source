import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stationDisplayName, stationLogoUrl, stationSlug } from "@/lib/catalog";
import { StationIdentity } from "@/components/station-identity";
import { listRecentReports } from "@/lib/store";

export const dynamic = "force-dynamic";

async function reportsFor(slug: string) {
  return (await listRecentReports())
    .filter((report) => stationSlug(report.host) === slug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function generateMetadata({ params }: PageProps<"/reports/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const reports = await reportsFor(slug);
  if (!reports.length) return { title: "报告列表不存在" };
  return { title: `${stationDisplayName(reports[0].host)} 的 ${reports.length} 份检测报告` };
}

export default async function StationReportsPage({ params }: PageProps<"/reports/[slug]">) {
  const { slug } = await params;
  const reports = await reportsFor(slug);
  if (!reports.length) notFound();
  const host = reports[0].host;
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/reports" className="text-sm font-medium text-[#176b5b]">← 返回公开报告</Link>
      <h1 className="mt-5 text-4xl font-bold"><StationIdentity name={stationDisplayName(host)} domain={host} logoUrl={stationLogoUrl(host)} /></h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">共 {reports.length} 份公开报告，按检测时间从新到旧排列。点击任意一行查看完整探针结果和证据。</p>
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[11rem_8rem_1fr_8rem_7rem] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 md:grid">
          <span>检测时间</span><span>协议</span><span>目标模型</span><span>分数 / 判定</span><span>详情</span>
        </div>
        {reports.map((report) => (
          <Link key={report.id} href={`/r/${report.id}`} className="grid gap-2 border-t border-slate-100 px-5 py-4 text-sm hover:bg-slate-50 md:grid-cols-[11rem_8rem_1fr_8rem_7rem] md:items-center md:gap-4">
            <time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString("zh-CN")}</time>
            <span>{report.protocol}</span>
            <span className="font-mono text-xs">{report.model}</span>
            <strong>{report.score} · {report.verdict}</strong>
            <span className="font-medium text-[#176b5b]">完整报告 →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
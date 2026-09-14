import Link from "next/link";
import { notFound } from "next/navigation";
import { AdBanner } from "@/components/ad-slot";
import { ResultView } from "@/components/result-view";
import { adsFor } from "@/lib/marketplace";
import { readReport } from "@/lib/store";


export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await readReport(id);
  if (!report) notFound();

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_280px]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs text-slate-500">公开报告 · {new Date(report.createdAt).toLocaleString("zh-CN")} · 不含 API Key</p>
        <div className="mt-4">
          <ResultView result={report} />
        </div>
        <Link href={`/?endpoint=${encodeURIComponent(report.baseUrl)}&protocol=${report.protocol}`} className="mt-6 inline-block text-sm font-medium text-[#176b5b]">对这个接口再测一次 →</Link>
      </article>
      <aside className="space-y-4">
        <AdBanner ad={adsFor("report-side")[0]} />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          本页是用户自愿公开的单次样本。付费广告出现在侧栏，不会改写左侧分数。
        </div>
      </aside>
    </main>
  );
}

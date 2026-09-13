import Link from "next/link";
import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { Badge } from "@/components/ui/badge";
import { adsFor, featuredListings, monetizationPolicy } from "@/lib/marketplace";
import { listRecentReports } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "公开收录｜SignalDeck",
  description: "付费精选入口与用户公开的检测报告。分数与付费无关。",
};

export default async function DirectoryPage() {
  const reports = await listRecentReports();
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <AdBanner ad={adsFor("directory-top")[0]} />
      <Badge variant="outline" className="mt-8">公开层</Badge>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">收录与公开报告</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{monetizationPolicy}</p>

      <div className="mt-8">
        <FeaturedListings listings={featuredListings()} />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">最近公开报告</h2>
            <p className="mt-2 text-sm text-slate-500">由用户主动公开，不含 API Key。不是付费排行榜。</p>
          </div>
          <Link href="/" className="text-sm font-medium text-[#176b5b]">去做检测 →</Link>
        </div>
        {reports.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-600">
            还没有公开报告。完成检测后点击「公开这份报告」，就会出现在这里。
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {reports.map((item) => (
              <Link key={item.id} href={`/r/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50">
                <div>
                  <div className="font-medium">{item.host}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.protocol} · {item.model} · {new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                </div>
                <div className="text-sm font-semibold">{item.score} · {item.verdict}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

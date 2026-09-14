import Link from "next/link";
import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { PaidTopTen, ProBoard, SponsorBoard } from "@/components/paid-inventory";
import { Badge } from "@/components/ui/badge";
import { adsFor, featuredListings, monetizationPolicy, proListings } from "@/lib/marketplace";
import { approvedOperatorListings, listRecentReports } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "公开榜｜SignalDeck",
  description: "公开检测样本榜与付费展示位。分数与付费无关。",
};

export default async function DirectoryPage() {
  const [reports, operatorListings] = await Promise.all([listRecentReports(), approvedOperatorListings()]);
  const ranked = [...reports].sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
  const featured = featuredListings(operatorListings);
  const pro = proListings(operatorListings);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <AdBanner ad={adsFor("directory-top")[0]} />
      <Badge variant="outline" className="mt-8">内容层</Badge>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">公开榜与付费展示</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{monetizationPolicy}</p>

      <div className="mt-8 grid gap-4">
        <SponsorBoard />
        <PaidTopTen />
        <ProBoard listings={pro} />
        <FeaturedListings listings={featured} />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">公开样本榜</h2>
            <p className="mt-2 text-sm text-slate-500">按用户自愿公开的检测分数排序。这不是采购建议，也不是付费排名。</p>
          </div>
          <Link href="/" className="text-sm font-medium text-[#176b5b]">去做检测 →</Link>
        </div>
        {ranked.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-600">
            还没有公开报告。完成检测后点击「公开这份报告」，就会进入样本榜。
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {ranked.map((item, index) => (
              <Link key={item.id} href={`/r/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-6 font-mono text-xs text-slate-400">{index + 1}</span>
                  <div>
                    <div className="font-medium">{item.host}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.protocol} · {item.model} · {new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                  </div>
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

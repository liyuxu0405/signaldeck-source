import Link from "next/link";
import { AdBanner } from "@/components/ad-slot";
import { FeaturedListings } from "@/components/featured-listings";
import { PaidTopTen, ProBoard, SponsorBoard } from "@/components/paid-inventory";
import { Badge } from "@/components/ui/badge";
import { StationIdentity } from "@/components/station-identity";
import { adsFor, featuredListings, proListings } from "@/lib/marketplace";
import { filterCatalogStations } from "@/lib/catalog";
import type { Protocol } from "@/lib/detection";
import { buildStationBoard } from "@/lib/rank";
import { approvedOperatorListings, listRecentReports } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI API 中转站目录与公开检测榜｜SignalDeck",
  description: "浏览 Claude、OpenAI、Gemini 中转站与官方网关。目录收录不代表推荐，评分只来自 SignalDeck 公开检测报告。",
};

const protocolLabels: Record<string, string> = { all: "全部", anthropic: "Claude", openai: "OpenAI", gemini: "Gemini" };

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ protocol?: string; q?: string }> }) {
  const query = await searchParams;
  const protocol = (["anthropic", "openai", "gemini"] as const).includes(query.protocol as Protocol)
    ? query.protocol as Protocol
    : undefined;
  const [reports, operatorListings] = await Promise.all([listRecentReports(), approvedOperatorListings()]);
  const board = buildStationBoard(reports);
  const stations = filterCatalogStations({ protocol, query: query.q });
  const reportByHost = new Map(board.ranked.map((item) => [item.domain, item]));

  const featured = featuredListings(operatorListings);
  const pro = proListings(operatorListings);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <AdBanner ad={adsFor("directory-top")[0]} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div>
          <Badge variant="outline">独立目录 · 本站证据单独标记</Badge>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">AI API 中转站目录</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            当前收录 {stations.length} 个匹配入口。初始站点来自公开资料，只代表“可发现”；有本站公开报告后才展示 SignalDeck 分数。
            外部目录的分数、在线率和认证不会被搬运成本站结论。
          </p>
        </div>
        <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="station-search" className="text-xs font-semibold text-slate-600">搜索名称或域名</label>
          <input id="station-search" name="q" defaultValue={query.q ?? ""} placeholder="例如 omniakey" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          {protocol && <input type="hidden" name="protocol" value={protocol} />}
          <button className="mt-3 h-9 w-full rounded-lg bg-[#176b5b] text-sm font-medium text-white">搜索目录</button>
        </form>
      </div>

      <nav className="mt-7 flex flex-wrap gap-2" aria-label="协议筛选">
        {Object.entries(protocolLabels).map(([value, label]) => {
          const active = (protocol ?? "all") === value;
          const href = value === "all" ? "/directory" : `/directory?protocol=${value}`;
          return <Link key={value} href={href} className={`rounded-full border px-4 py-2 text-sm ${active ? "border-[#176b5b] bg-[#176b5b] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>;
        })}
      </nav>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {stations.map((station) => {
          const result = reportByHost.get(station.domain);
          return (
            <article key={station.id} className="grid gap-4 border-b border-slate-100 px-4 py-5 last:border-b-0 md:grid-cols-[minmax(12rem,1.1fr)_minmax(12rem,1.5fr)_9rem_11rem] md:items-center md:px-6">
              <div className="min-w-0">
                <a href={station.websiteUrl ?? `https://${station.domain}`} target="_blank" rel="noreferrer nofollow" className="inline-flex max-w-full hover:text-[#176b5b]"><StationIdentity compact name={station.name} domain={station.domain} logoUrl={station.logoUrl} /></a>
                <div className="mt-2 flex flex-wrap gap-1">
                  {station.protocols.map((item) => <span key={item} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{protocolLabels[item]}</span>)}
                </div>
              </div>
              <p className="line-clamp-2 text-sm leading-6 text-slate-600">{station.summary}</p>
              <div className="text-sm">
                {result ? <><strong className="block text-emerald-800">本站 {result.score} 分</strong><span className="text-xs text-slate-500">{result.sampleCount} 个日样本</span></> : <><strong className="block text-slate-700">等待检测</strong><span className="text-xs text-slate-500">暂无本站分数</span></>}
              </div>
              <div className="flex items-center gap-4 text-sm md:justify-end">
                <Link href={`/stations/${station.id}`} className="text-slate-500">检测档案</Link>
                <a href={station.websiteUrl ?? `https://${station.domain}`} target="_blank" rel="noreferrer nofollow" className="font-medium text-[#176b5b]">直达官网 ↗</a>
              </div>
            </article>
          );
        })}
      </section>

      {stations.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">没有匹配站点。可以清空关键词或切换协议。</div>}

      <section className="mt-14 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-9">
        <Badge variant="secondary">如何阅读目录</Badge>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <Guide number="01" title="收录不等于推荐">公开资料出现过的站点可以进入目录，但不会自动获得分数、认证或官网直达。</Guide>
          <Guide number="02" title="只认本站证据">绿色分数来自 SignalDeck 服务端签发报告；没有用户 API Key 时，我们不会代替站点编造测试。</Guide>
          <Guide number="03" title="先小额验证">中转服务可能随时变化。采购前应检测目标模型、核对计费，并控制首充金额。</Guide>
        </div>
      </section>

      <div className="mt-12 grid gap-4"><SponsorBoard /><PaidTopTen /><ProBoard listings={pro} /><FeaturedListings listings={featured} /></div>

      <div className="mt-10 text-center"><Link href="/reports" className="text-sm font-medium text-[#176b5b]">查看全部本站公开报告 →</Link></div>
    </main>
  );
}

function Guide({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <div><span className="font-mono text-xs text-emerald-300">{number}</span><h3 className="mt-2 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{children}</p></div>;
}

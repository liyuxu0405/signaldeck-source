import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { StationIdentity } from "@/components/station-identity";
import { catalogAliasHosts, catalogStations, findCatalogStation } from "@/lib/catalog";
import { listRecentReports } from "@/lib/store";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return catalogStations.map((station) => ({ slug: station.id }));
}

export async function generateMetadata({ params }: PageProps<"/stations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const station = findCatalogStation(slug);
  if (!station) return { title: "站点不存在" };
  return {
    title: `${station.name} 中转站资料与检测记录`,
    description: `${station.domain} 的协议、公开来源与 SignalDeck 独立检测记录。目录收录不代表推荐。`,
    alternates: { canonical: `/stations/${station.id}` },
  };
}

export default async function StationPage({ params }: PageProps<"/stations/[slug]">) {
  const { slug } = await params;
  const station = findCatalogStation(slug);
  if (!station) notFound();
  const aliases = new Set(catalogAliasHosts(station));
  const reports = (await listRecentReports()).filter((report) => aliases.has(report.host.toLowerCase()));
  const latest = reports[0];
  const protocolName = (value: string) => value === "anthropic" ? "Claude" : value === "gemini" ? "Gemini" : "OpenAI";
  const detectEndpoint = station.endpoint ?? `https://${station.domain}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${station.name} 中转站资料与检测记录`,
    description: station.summary,
    about: { "@type": "Organization", name: station.name, url: station.websiteUrl ?? `https://${station.domain}` },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/directory" className="text-sm font-medium text-[#176b5b]">← 返回中转站目录</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_19rem]">
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{station.kind === "relay" ? "公开目录站点" : station.kind === "official" ? "官方基准入口" : "多模型平台"}</Badge>
            {station.protocols.map((protocol) => <Badge key={protocol} variant="outline">{protocolName(protocol)}</Badge>)}
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl"><StationIdentity name={station.name} domain={station.domain} logoUrl={station.logoUrl} /></h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-650">{station.summary}</p>

          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">SignalDeck 独立检测状态</h2>
            {latest ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Stat label="最近分数" value={String(latest.score)} />
                <Stat label="判定" value={latest.verdict} />
                <Stat label="公开样本" value={`${reports.length} 份`} />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                尚无 SignalDeck 公开检测报告。本站不会把外部平台的分数、认证或在线率复制为自己的结论。
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {station.protocols.map((protocol) => <Link key={protocol} href={`/?endpoint=${encodeURIComponent(detectEndpoint)}&protocol=${protocol}`} className="rounded-lg bg-[#176b5b] px-4 py-2 text-sm font-medium text-white">检测 {protocolName(protocol)}</Link>)}
              {latest && <Link href={`/r/${latest.id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium">查看最新报告</Link>}
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">公开报告历史</h2>
            {reports.length === 0 ? <p className="mt-4 text-sm text-slate-500">暂无历史。完成检测后可选择公开报告。</p> : (
              <div className="mt-4 divide-y divide-slate-100">
                {reports.map((report) => <Link href={`/r/${report.id}`} key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm hover:text-[#176b5b]"><span>{protocolName(report.protocol)} · {report.model}<span className="ml-2 text-xs text-slate-400">{report.createdAt.slice(0, 10)}</span></span><strong>{report.score} · {report.verdict}</strong></Link>)}
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <Advice title="采购前怎么测">使用准备购买的模型和真实 API Key，至少检查流式结构、Token 计数、工具调用与长上下文；不要只看一次连通。</Advice>
            <Advice title="如何控制风险">先小额充值，确认退款和发票主体，保存价格页面与沟通记录。中转站状态可能变化，历史通过不保证未来可用。</Advice>
          </section>
        </article>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">资料来源</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{station.sourceLabel}。这里只引用域名和公开声明的协议，不继承外部评分。</p>
            <a href={station.websiteUrl ?? `https://${station.domain}`} target="_blank" rel="noreferrer nofollow" className="mt-4 inline-block text-sm font-medium text-[#176b5b]">访问中转站官网 ↗</a>
            <a href={station.sourceUrl} target="_blank" rel="noreferrer nofollow" className="mt-3 block text-xs text-slate-500">查看目录资料来源</a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
            <h2 className="font-bold">站长认领</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">运营方可提交名称、简介和付费位置申请；确认收款后开通展示，付费不影响检测分数。</p>
            <Link href="/account" className="mt-4 inline-block text-sm font-medium text-emerald-300">进入站长后台 →</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-xl font-bold">{value}</div></div>; }
function Advice({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{children}</p></div>; }